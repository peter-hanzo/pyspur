import asyncio
import base64
import dataclasses
import logging
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from functools import partial, wraps
from typing import Awaitable, Callable, Optional

import numpy as np
import tiktoken
from dotenv import load_dotenv
from openai import AsyncOpenAI
from sklearn.metrics.pairwise import cosine_similarity
from tenacity import AsyncRetrying, stop_after_attempt, wait_random_exponential

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
GPT_MODEL = "gpt-4o-mini"
# Static prompts


def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if asyncio.iscoroutinefunction(func):
            return async_timeit_wrapper(func, *args, **kwargs)
        else:
            return sync_timeit_wrapper(func, *args, **kwargs)

    async def async_timeit_wrapper(func, *args, **kwargs):
        start_time = time.perf_counter()
        result = await func(*args, **kwargs)
        end_time = time.perf_counter()
        total_time = end_time - start_time
        print(f"Function {func.__name__} Took {total_time:.4f} seconds")
        return result

    def sync_timeit_wrapper(func, *args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        total_time = end_time - start_time
        print(f"Function {func.__name__} Took {total_time:.4f} seconds")
        return result

    return wrapper


def create_messages(
    system_message: str,
    user_message: str,
    few_shot_examples: list[dict[str, str]] = None,
    history: list[dict[str, str]] = None,
) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": system_message}]
    if few_shot_examples is not None and len(few_shot_examples) > 0:
        for example in few_shot_examples:
            messages.append({"role": "user", "content": example["input"]})
            messages.append({"role": "assistant", "content": example["output"]})
    if history and len(history) > 0:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


def create_messages_with_images(
    system_message: str,
    base64_image: str,
    user_message: str = "",
    few_shot_examples: list[dict] = [],
    history: list[dict] = [],
) -> list[dict[str, str]]:

    messages = [
        {"role": "system", "content": [{"type": "text", "text": system_message}]},
    ]
    if few_shot_examples:
        for example in few_shot_examples:
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": example["input"]},
                    ],
                }
            )
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": {example["img"]},
                            },
                        },
                    ],
                }
            )
            messages.append(
                {
                    "role": "assistant",
                    "content": [
                        {"type": "text", "text": example["output"]},
                    ],
                }
            )
    if history:
        messages.extend(history)
    messages.append(
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": base64_image,
                    },
                },
            ],
        }
    )
    if user_message:
        messages[-1]["content"].append({"type": "text", "text": user_message})
    return messages


def async_retry(*dargs, **dkwargs):
    def decorator(f):
        r = AsyncRetrying(*dargs, **dkwargs)

        async def wrapped_f(*args, **kwargs):
            async for attempt in r:
                with attempt:
                    return await f(*args, **kwargs)

        return wrapped_f

    return decorator


@async_retry(wait=wait_random_exponential(min=30, max=120), stop=stop_after_attempt(20))
async def completion_with_backoff(**kwargs):

    try:
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        print(e)
        raise e


@async_retry(wait=wait_random_exponential(min=30, max=300), stop=stop_after_attempt(30))
async def get_embedding(text: str, dimensions: int = 384) -> list[float]:
    try:
        response = await client.embeddings.create(
            input=text, model="text-embedding-3-small", dimensions=dimensions
        )
        return response.data[0].embedding
    except Exception as e:
        print(e)
        raise e


async def generate_text(
    messages: list[dict],
    model_name: str,
    temperature: float = 0.5,
    json_mode: bool = False,
) -> str:
    """Generate a text response from a list of messages asynchronously."""
    kwargs = {
        "model": model_name,
        "max_tokens": 1000,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    output = await completion_with_backoff(**kwargs)
    return output


async def generate_texts_in_parallel(
    list_of_messages: list[list[dict]],
    temperature: float,
    semaphore_value: int = 2,
    model_name: str = GPT_MODEL,
) -> list[dict]:
    semaphore = asyncio.Semaphore(semaphore_value)

    async def fetch(messages: list[str]):
        async with semaphore:
            return await loop.run_in_executor(
                None,
                partial(
                    completion_with_backoff,
                    messages=messages,
                    model=model_name,
                    temperature=temperature,
                ),
            )

    results: list[dict] = []
    with ThreadPoolExecutor() as executor:
        loop = asyncio.get_running_loop()
        futures = [fetch(messages) for messages in list_of_messages]
        results = await asyncio.gather(*futures)
    return results


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


async def compute_embeddings(papers):
    texts = [paper["title"] + " " + paper["abstract"] for paper in papers]
    embeddings = []
    for text in texts:
        try:
            embedding = await get_embedding(text, dimensions=EMBEDDING_DIMENSIONS)
            embeddings.append(embedding)
        except Exception as e:
            print(f"Error obtaining embedding for text: {e}")
            embeddings.append(
                [0] * EMBEDDING_DIMENSIONS
            )  # Placeholder for failed embeddings
    embeddings = np.array(embeddings)
    return embeddings


async def find_top_k_similar(old_papers, new_papers, k=5):
    old_embeddings = await compute_embeddings(old_papers)
    new_embeddings = await compute_embeddings(new_papers)

    similarity_matrix = cosine_similarity(old_embeddings, new_embeddings)
    top_k_indices = np.argsort(-similarity_matrix, axis=1)[:, :k]

    top_k_similar_papers = {}
    for i, old_paper in enumerate(old_papers):
        similar_papers = []
        for idx in top_k_indices[i]:
            similar_papers.append(
                {
                    "paper": new_papers[idx],
                    "similarity_score": similarity_matrix[i][idx],
                }
            )
        top_k_similar_papers[old_paper["id"]] = similar_papers
    return top_k_similar_papers
