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


# GSM8K Prompts
PREAMBLE = """As an expert problem solver solve step by step the following mathematical questions."""


PROMPT = """Q: There are 15 trees in the grove. Grove workers will plant trees in the grove today. After they are done, there will be 21 trees. How many trees did the grove workers plant today?
A: We start with 15 trees. Later we have 21 trees. The difference must be the number of trees they planted. So, they must have planted 21 - 15 = 6 trees. The answer is 6.

Q: If there are 3 cars in the parking lot and 2 more cars arrive, how many cars are in the parking lot?
A: There are 3 cars in the parking lot already. 2 more arrive. Now there are 3 + 2 = 5 cars. The answer is 5.

Q: Leah had 32 chocolates and her sister had 42. If they ate 35, how many pieces do they have left in total?
A: Leah had 32 chocolates and Leah's sister had 42. That means there were originally 32 + 42 = 74 chocolates. 35 have been eaten. So in total they still have 74 - 35 = 39 chocolates. The answer is 39.

Q: Jason had 20 lollipops. He gave Denny some lollipops. Now Jason has 12 lollipops. How many lollipops did Jason give to Denny?
A: Jason had 20 lollipops. Since he only has 12 now, he must have given the rest to Denny. The number of lollipops he has given to Denny must have been 20 - 12 = 8 lollipops. The answer is 8.

Q: Shawn has five toys. For Christmas, he got two toys each from his mom and dad. How many toys does he have now?
A: He has 5 toys. He got 2 from mom, so after that he has 5 + 2 = 7 toys. Then he got 2 more from dad, so in total he has 7 + 2 = 9 toys. The answer is 9.

Q: There were nine computers in the server room. Five more computers were installed each day, from monday to thursday. How many computers are now in the server room?
A: There are 4 days from monday to thursday. 5 computers were added each day. That means in total 4 * 5 = 20 computers were added. There were 9 computers in the beginning, so now there are 9 + 20 = 29 computers. The answer is 29.

Q: Michael had 58 golf balls. On tuesday, he lost 23 golf balls. On wednesday, he lost 2 more. How many golf balls did he have at the end of wednesday?
A: Michael initially had 58 balls. He lost 23 on Tuesday, so after that he has 58 - 23 = 35 balls. On Wednesday he lost 2 more so now he has 35 - 2 = 33 balls. The answer is 33.

Q: Olivia has $23. She bought five bagels for $3 each. How much money does she have left?
A: She bought 5 bagels for $3 each. This means she spent 5 * $3 = $15 on the bagels. She had $23 in beginning, so now she has $23 - $15 = $8. The answer is 8."""

TEMPLATE = """
Q: {question}
A:"""


def generate_full_prompt(problem):
    """Generates the full prompt for the model."""
    full_prompt = (
        PREAMBLE
        + "\n\n"
        + PROMPT
        + "\n"
        + TEMPLATE.format(question=problem["question"])
    )
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


async def evaluate_model_on_dataset(
    dataset_name: str,
    split: Optional[str] = "test",
    subset: Optional[str] = "main",
    batch_size: int = 10,
) -> dict:
    """Evaluates the model on the specified dataset and returns evaluation metrics."""
    dataset = load_dataset_by_name(dataset_name, split, subset)
    all_responses = {}
    short_responses = {}
    total = len(dataset)
    correct = 0
    task_id = 0

    for batch in dataset.iter(batch_size=batch_size):
        print(f"Processing batch starting at task_id {task_id}")
        # Iterate over the questions and answers in the batch
        for question, answer in zip(batch["question"], batch["answer"]):
            full_prompt = generate_full_prompt({"question": question})
            # Call the model for each prompt
            response = await call_model(full_prompt)
            response_text = response.split("\nQ:")[0]
            predicted_answer = extract_answer(response_text)
            ground_truth_answer = maybe_remove_comma(find_number(answer))
            is_correct = evaluate_answer(predicted_answer, ground_truth_answer)
            correct += int(is_correct)
            all_responses[task_id] = response_text
            short_responses[task_id] = predicted_answer
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
