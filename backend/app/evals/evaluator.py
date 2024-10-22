# inspired by https://github.com/google-deepmind/gemma/blob/main/colabs/gsm8k_eval.ipynb
import re
from typing import Optional, List, Dict, Any
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
import pandas as pd

from app.evals.common import (
    MULTILINGUAL_ANSWER_REGEXES,
    MULTILINGUAL_ANSWER_PATTERN_TEMPLATE,
    normalize_extracted_answer,
    normalize_math_response,
)


def find_numbers(x: str) -> List[str]:
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


def extract_mcq_answer(response_text: str, language: str = "EN") -> str:
    """Extracts the answer letter (e.g., A, B, C, D) from multiple-choice responses."""
    # Define regex patterns for different languages if needed
    answer_regex = r"\b[A-D]\b"  # Matches standalone A, B, C, or D
    match = re.search(answer_regex, response_text.strip().upper())
    if match:
        return match.group(0)
    else:
        # If no match is found, attempt to extract from the first line
        ans = response_text.strip().split("\n")[0]
        ans = re.sub(r"[^A-D]", "", ans.upper())
        return ans


def load_dataset_by_name(
    dataset_name: str,
    split: Optional[str] = "test",
    subset: Optional[str] = None,
) -> Dataset:
    """Loads a dataset by name or from a CSV file and returns the specified split."""
    if dataset_name.endswith(".csv"):
        # Load dataset from CSV file
        dataset = pd.read_csv(dataset_name)
        # Convert pandas DataFrame to Hugging Face Dataset
        from datasets import Dataset

        dataset = Dataset.from_pandas(dataset)
    else:
        if subset:
            dataset = load_dataset(dataset_name, subset, cache_dir="/tmp")
        else:
            dataset = load_dataset(dataset_name, cache_dir="/tmp")
        if split:
            dataset = dataset[split]
    return dataset


def load_prompts_from_yaml(yaml_file_path: str) -> dict:
    with open(yaml_file_path, "r") as file:
        data = yaml.safe_load(file)
    return data  # Return the entire data dict


def generate_full_prompt(problem, doc_to_text, preamble, prompt):
    """Generates the full prompt for the model."""
    doc_to_text_template = Template(doc_to_text)
    question_text = doc_to_text_template.render(**problem)
    full_prompt = f"{preamble}\n\n{prompt}\n{question_text}"
    return full_prompt.strip()


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


def extract_answer(response_text, answer_extraction: Dict[str, Any]):
    """Extracts the answer from the response text based on extraction logic."""
    extraction_method = answer_extraction.get("method", "default")
    if extraction_method == "find_number":
        answer = maybe_remove_comma(find_number(response_text))
        return answer
    elif extraction_method == "mcq":
        # Use MULTILINGUAL_ANSWER_REGEXES to extract the answer
        for answer_regex in MULTILINGUAL_ANSWER_REGEXES:
            regex = MULTILINGUAL_ANSWER_PATTERN_TEMPLATE.format(answer_regex)
            match = re.search(regex, response_text)
            if match:
                extracted_answer = normalize_extracted_answer(match.group(1))
                return extracted_answer
        return ""  # Return empty if no match is found
    elif extraction_method == "math":
        extracted_answer = normalize_math_response(response_text)
        return extracted_answer
    else:
        # Default extraction method
        return response_text.strip()


def evaluate_answer(predicted_answer, ground_truth_answer, evaluation: Dict[str, Any]):
    """Evaluates if the predicted answer matches the ground truth based on evaluation logic."""
    evaluation_method = evaluation.get("method", "default").lower()
    if evaluation_method == "numeric":
        try:
            correct = float(predicted_answer) == float(ground_truth_answer)
        except:
            correct = predicted_answer == ground_truth_answer
        return correct
    elif evaluation_method == "exact_match":
        return predicted_answer.strip().lower() == ground_truth_answer.strip().lower()
    elif evaluation_method == "mcq":
        # Normalize both answers before comparison
        return (
            normalize_extracted_answer(predicted_answer).strip().upper()
            == normalize_extracted_answer(ground_truth_answer).strip().upper()
        )
    else:
        # Default evaluation method
        return predicted_answer == ground_truth_answer


def get_ground_truth_answer(problem, doc_to_target):
    """Extracts the ground truth answer using the doc_to_target template."""
    doc_to_target_template = Template(doc_to_target)
    ground_truth = doc_to_target_template.render(**problem)
    return ground_truth.strip()


async def evaluate_on_dataset(
    dataset: Dataset,
    task_config: Dict[str, Any],
    batch_size: int = 10,
    subject: Optional[str] = None,
    subject_category_mapping: Optional[Dict[str, str]] = None,
    category_correct: Optional[Dict[str, int]] = None,
    category_total: Optional[Dict[str, int]] = None,
) -> dict:
    """Evaluates the model on the given dataset and returns evaluation metrics."""
    # Extract necessary components from task_config
    preamble = task_config.get("preamble", "")
    prompt = task_config.get("prompt", "")
    doc_to_text = task_config.get("doc_to_text", "")
    doc_to_target = task_config.get("doc_to_target", "")
    answer_extraction = task_config.get("answer_extraction", {})
    evaluation = task_config.get("evaluation", {})

    all_responses = {}
    short_responses = {}
    total = len(dataset)
    correct = 0
    task_id = 0

    # Initialize category_correct and category_total if they are None
    if subject_category_mapping and category_correct is None and category_total is None:
        category_correct = {
            category: 0 for category in set(subject_category_mapping.values())
        }
        category_total = {
            category: 0 for category in set(subject_category_mapping.values())
        }

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
        for idx, problem in enumerate(transformed_batch):
            response_text = responses[idx]
            all_responses[task_id] = response_text
            predicted_answer = extract_answer(response_text, answer_extraction)
            short_responses[task_id] = predicted_answer
            ground_truth_answer_raw = get_ground_truth_answer(problem, doc_to_target)
            ground_truth_answer = extract_answer(
                ground_truth_answer_raw, answer_extraction
            )
            is_correct = evaluate_answer(
                predicted_answer, ground_truth_answer, evaluation
            )
            correct += int(is_correct)

            # Category-wise aggregation
            if subject_category_mapping:
                if "subject" in problem:
                    subject = problem["subject"]
                # Use provided subject if passed to function
                if not subject and "Subject" in problem:
                    subject = problem["Subject"]
                category = subject_category_mapping.get(subject, "other")
                category_total[category] += 1
                if is_correct:
                    category_correct[category] += 1

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
    if subject_category_mapping:
        metrics["category_correct"] = category_correct
        metrics["category_total"] = category_total
        metrics["category_accuracy"] = {
            category: (
                category_correct[category] / category_total[category]
                if category_total[category] > 0
                else 0
            )
            for category in category_correct
        }
    return metrics


async def evaluate_model_on_dataset(
    task_config: dict,
    batch_size: int = 10,
) -> dict:
    """Evaluates the model on the specified dataset and returns evaluation metrics."""
    # Extract configurations from task_config
    dataset_name = task_config.get("dataset_name")
    dataset_split = task_config.get("dataset_split", "test")
    dataset_subsets = task_config.get("dataset_subsets", None)
    subject_category_mapping = task_config.get("subject_category_mapping", None)

    # Ensure dataset_name is provided
    if not dataset_name:
        raise ValueError("dataset_name must be provided in task_config.")

    # Initialize category_correct and category_total if mapping exists
    if subject_category_mapping:
        category_correct = {
            category: 0 for category in set(subject_category_mapping.values())
        }
        category_total = {
            category: 0 for category in set(subject_category_mapping.values())
        }
    else:
        category_correct = None
        category_total = None

    # Check if dataset_subsets is a list
    if isinstance(dataset_subsets, list):
        total_correct = 0
        total_samples = 0
        subset_metrics = {}
        for subset in dataset_subsets:
            print(f"Evaluating subset: {subset}")
            # Load the dataset for the current subset
            dataset = load_dataset_by_name(dataset_name, dataset_split, subset)
            metrics = await evaluate_on_dataset(
                dataset,
                task_config,
                batch_size,
                subject=subset,
                subject_category_mapping=subject_category_mapping,
                category_correct=category_correct,
                category_total=category_total,
            )
            subset_metrics[subset] = metrics
            total_correct += metrics["correct_predictions"]
            total_samples += metrics["total_samples"]
        # Calculate overall accuracy across all subsets
        overall_accuracy = total_correct / total_samples if total_samples > 0 else 0
        results = {
            "total_samples": total_samples,
            "correct_predictions": total_correct,
            "accuracy": overall_accuracy,
            "subset_metrics": subset_metrics,
        }
        if subject_category_mapping:
            # Add category-wise accuracy
            category_accuracy = {
                category: (
                    category_correct[category] / category_total[category]
                    if category_total[category] > 0
                    else 0
                )
                for category in category_correct
            }
            results["category_accuracy"] = category_accuracy
        return results
    else:
        # Handle the case where dataset_subsets is a single subset or None
        # Load the dataset
        dataset = load_dataset_by_name(dataset_name, dataset_split, dataset_subsets)
        metrics = await evaluate_on_dataset(
            dataset,
            task_config,
            batch_size,
            subject=dataset_subsets,
            subject_category_mapping=subject_category_mapping,
        )
        results = metrics
        if subject_category_mapping:
            results["category_accuracy"] = metrics.get("category_accuracy", {})
        return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate LLM on a dataset.")
    parser.add_argument(
        "--task_config_path",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "tasks", "math.yaml"),
        help="Path to the task configuration YAML file.",
    )
    args = parser.parse_args()

    # Load task configuration from YAML file
    task_config = load_prompts_from_yaml(args.task_config_path)
    # Run the evaluation
    results = asyncio.run(evaluate_model_on_dataset(task_config))

    # Print the results
    print("Overall Accuracy:", results.get("accuracy", 0))
    # Print category-wise accuracy if available
    category_accuracy = results.get("category_accuracy", {})
    if category_accuracy:
        print("\nCategory-wise Accuracy:")
        for category, accuracy in category_accuracy.items():
            print(f"Category: {category}, Accuracy: {accuracy:.4f}")
    # Print subset metrics
    task_metrics = results.get("subset_metrics", {})
    for task, metrics in task_metrics.items():
        print(f"\nSubset: {task}, Accuracy: {metrics['accuracy']}")
