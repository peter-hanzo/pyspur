# inspired by https://github.com/google-deepmind/gemma/blob/main/colabs/gsm8k_eval.ipynb
import re
from typing import Optional
import asyncio
from datasets import load_dataset, Dataset
from app.nodes.llm.llm import (
    BasicLLMNode,
    BasicLLMNodeConfig,
    BasicLLMNodeInput,
)
import yaml
import os
from jinja2 import Template


def find_numbers(x: str) -> list[str]:
    """Finds all numbers in a string."""
    numbers = re.compile(
        r"-?[\d,]*\.?\d+",
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    ).findall(x)
    return numbers


def find_number(x: str, answer_delimiter: str = "The answer is") -> str:
    """Finds the most relevant number in a string."""
    if answer_delimiter in x:
        answer = x.split(answer_delimiter)[-1]
        numbers = find_numbers(answer)
        if numbers:
            return numbers[0]
    # In general, select the last number in the string.
    numbers = find_numbers(x)
    if numbers:
        return numbers[-1]
    return ""


def maybe_remove_comma(x: str) -> str:
    # Example: 5,600 -> 5600
    return x.replace(",", "")


def load_dataset_by_name(
    dataset_name: str,
    split: Optional[str] = "test",
    subset: Optional[str] = "main",
) -> Dataset:
    """Loads a dataset by name and returns the specified split."""
    if subset:
        dataset = load_dataset(dataset_name, subset, cache_dir="/tmp")
    else:
        dataset = load_dataset(dataset_name, cache_dir="/tmp")
    if split:
        dataset = dataset[split]
    return dataset


def load_prompts_from_yaml(yaml_file_path):
    with open(yaml_file_path, "r") as file:
        data = yaml.safe_load(file)
    return (
        data["preamble"],
        data["prompt"],
        data["doc_to_text"],
        data["doc_to_target"],
    )


def generate_full_prompt(problem, doc_to_text, preamble, prompt):
    """Generates the full prompt for the model."""
    doc_to_text_template = Template(doc_to_text)
    question_text = doc_to_text_template.render(problem)
    full_prompt = preamble + "\n\n" + prompt + "\n" + question_text
    return full_prompt


async def call_model(full_prompt):
    """Calls the LLM model using BasicLLMNode."""
    # Instantiate the BasicLLMNode with the desired configuration
    basic_llm_node = BasicLLMNode(
        config=BasicLLMNodeConfig(
            llm_name="gpt-4o-mini",
            max_tokens=256,
            temperature=0.7,
            json_mode=False,
            system_prompt="",  # You can set this if needed
            few_shot_examples=None,  # Add few-shot examples if required
        )
    )
    # Create the input data
    basic_input = BasicLLMNodeInput(user_message=full_prompt)
    # Call the node to get the output
    basic_output = await basic_llm_node(basic_input)
    return basic_output.assistant_message


def extract_answer(response_text):
    """Extracts the numerical answer from the response text."""
    answer = maybe_remove_comma(find_number(response_text))
    return answer


def evaluate_answer(predicted_answer, ground_truth_answer):
    """Evaluates if the predicted answer matches the ground truth."""
    try:
        correct = float(predicted_answer) == float(ground_truth_answer)
    except:
        correct = predicted_answer == ground_truth_answer
    return correct


def get_ground_truth_answer(problem, doc_to_target):
    """Extracts the ground truth answer using the doc_to_target template."""
    doc_to_target_template = Template(doc_to_target)
    ground_truth = doc_to_target_template.render(problem)
    return ground_truth


async def evaluate_model_on_dataset(
    dataset_name: str,
    split: Optional[str] = "test",
    subset: Optional[str] = "main",
    batch_size: int = 10,
) -> dict:
    """Evaluates the model on the specified dataset and returns evaluation metrics."""
    # Load prompts from YAML file
    yaml_file_path = os.path.join("app", "evals", "tasks", "gsm8k.yaml")
    preamble, prompt, doc_to_text, doc_to_target = load_prompts_from_yaml(
        yaml_file_path
    )

    dataset = load_dataset_by_name(dataset_name, split, subset)
    all_responses = {}
    short_responses = {}
    total = len(dataset)
    correct = 0
    task_id = 0

    for batch in dataset.iter(batch_size=batch_size):
        transformed_batch = [
            dict(zip(batch.keys(), values)) for values in zip(*batch.values())
        ]
        print(f"Processing batch starting at task_id {task_id}")
        full_prompts = [
            generate_full_prompt(problem, doc_to_text, preamble, prompt)
            for problem in transformed_batch
        ]
        # Call the model on all prompts in the batch concurrently
        responses = await asyncio.gather(
            *[call_model(prompt) for prompt in full_prompts]
        )
        for i, problem in enumerate(transformed_batch):
            response_text = responses[i]
            all_responses[task_id] = response_text.split("\nQ:")[0]
            predicted_answer = extract_answer(all_responses[task_id])
            short_responses[task_id] = predicted_answer
            ground_truth_answer = maybe_remove_comma(
                find_number(get_ground_truth_answer(problem, doc_to_target))
            )
            is_correct = evaluate_answer(predicted_answer, ground_truth_answer)
            correct += int(is_correct)
            print(f"task_id {task_id}")
            print(f"Predicted answer: {predicted_answer}")
            print(f"Ground truth answer: {ground_truth_answer}")
            print(f"Correct: {correct} out of {task_id + 1}")
            print("=" * 40)
            task_id += 1
    # Calculate accuracy
    accuracy = correct / total
    # Aggregate metrics in a dictionary
    metrics = {
        "total_samples": total,
        "correct_predictions": correct,
        "accuracy": accuracy,
        "all_responses": all_responses,
        "short_responses": short_responses,
    }
    return metrics


if __name__ == "__main__":
    # Replace 'gsm8k' with any dataset name you want to evaluate on
    dataset_name = "gsm8k"
    asyncio.run(evaluate_model_on_dataset(dataset_name))
