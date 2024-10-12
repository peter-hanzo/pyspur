import os
import json
from typing import Dict, List, Tuple
import argparse


task_sets = {
    "training": {
        "challenges": os.path.join(
            "examples/arc/data/kaggle", "arc-agi_training_challenges.json"
        ),
        "solutions": os.path.join(
            "examples/arc/data/kaggle", "arc-agi_training_solutions.json"
        ),
    },
    "evaluation": {
        "challenges": os.path.join(
            "examples/arc/data/kaggle", "arc-agi_evaluation_challenges.json"
        ),
        "solutions": os.path.join(
            "examples/arc/data/kaggle", "arc-agi_evaluation_solutions.json"
        ),
    },
    "test": {
        "challenges": os.path.join(
            "examples/arc/data/kaggle", "arc-agi_test_challenges.json"
        ),
    },
}


def load_tasks_from_file(task_set):
    """
    Loads the tasks from the file and returns the challenges and solutions tasks
    """
    with open(task_set["challenges"], "r") as tasks:
        challenges = json.load(tasks)

    with open(task_set["solutions"], "r") as tasks:
        solutions = json.load(tasks)

    return challenges, solutions
