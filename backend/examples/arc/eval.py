# modified from https://www.kaggle.com/code/gregkamradt/arc-prize-scoring
import json
from typing import Tuple
import argparse
import sys


def score_submission(submission, solutions, include_task_scores=False) -> dict:
    """
    Score a submission against ground truth solutions.

    Args:
        submission (dict): The submission data.
        solutions (dict): The ground truth solutions.
        include_task_scores (bool, optional): Whether to include individual task scores. Defaults to False.

    Returns:
        dict: A dictionary containing the total score, total tasks scored, and optionally individual task scores.
    """

    total_score = 0
    total_tasks = 0
    task_scores = {}

    # Loop through each task in your submission to grade it
    for task_id, task_submission in submission.items():
        total_tasks += 1
        task_score = 0
        num_pairs = len(task_submission)

        # Go through each task pair. Most will only have 1
        for pair_index, pair_attempts in enumerate(task_submission):
            pair_correct = False

            # Look at both of your attempts
            for attempt_key, attempt in pair_attempts.items():

                # Check to see if one is correct
                if attempt == solutions[task_id][pair_index]:
                    pair_correct = True
                    break  # If it is correct, log it and break the loop

            if pair_correct:
                task_score += 1

        # Get the average score across the sub-tasks/pairs
        task_score /= num_pairs

        # Add it to your total score
        total_score += task_score

        # Log it for that task
        task_scores[task_id] = task_score

    result = {"total_score": total_score, "total_tasks_scored": total_tasks}

    if include_task_scores:
        result["task_scores"] = task_scores

    return result
