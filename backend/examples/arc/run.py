import argparse
import asyncio
import json
from collections import defaultdict
from typing import Dict, List

from dotenv import load_dotenv
from examples.arc.config.display import add_display_args
from examples.arc.config.prompt import add_prompt_args
from examples.arc.config.render import add_render_args
from examples.arc.eval import score_submission
from examples.arc.load_data import load_tasks_from_file, task_sets
from node_types.llm import (
    ModelName,
    StructuredOutputLLMNodeConfig,
    StructuredOutputLLMNodeInput,
    StructuredOutputLLMNodeType,
)
from node_types.python_func import (
    PythonFuncNodeConfig,
    PythonFuncNodeType,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run ARC with grid representation options."
    )
    parser.add_argument(
        "--grid-representation",
        choices=["pixels", "ascii", "hybrid"],
        default="ascii",
        help='Choose the grid representation: "pixels" or "ascii". Default is "ascii".',
    )
    add_display_args(parser)
    add_prompt_args(parser)
    add_render_args(parser)
    return parser.parse_args()


TRIVIAL_PROMPT = "Solve the below visual reasoning puzzle. You will get a number of input and output examples and are then asked to solve a new puzzle. Return the solution and nothing else."


async def main() -> None:

    args = parse_args()
    # Load the training data
    train_challenges, train_solutions = load_tasks_from_file(task_sets["training"])

    # Configure the LLM node
    llm_config = StructuredOutputLLMNodeConfig(
        llm_name=ModelName.GPT_4O_MINI,
        max_tokens=1000,
        temperature=0.8,
        system_prompt=TRIVIAL_PROMPT,
        output_schema={"solution": "list[list[int]]"},
    )

    # Create an instance of the LLM node
    llm_node = StructuredOutputLLMNodeType(llm_config)

    # Prepare the input data for LLM node
    llm_input = StructuredOutputLLMNodeInput(
        user_message=json.dumps(train_challenges["007bbfb7"])
    )

    # Configure the Python function node
    python_config = PythonFuncNodeConfig(
        code="""
def solve(challenge: dict) -> list[list[int]]:
    # Implement your solution logic here
    # Example: Increment each cell by 1
    solution = [[cell + 1 for cell in row] for row in challenge["test"][0]["input"]]
    return solution

# Invoke the solve function and set the output_data
output_data = {"solution": solve(input_data["challenge"])}
""",
        input_schema={"challenge": "dict"},
        output_schema={"solution": "list[list[int]]"},
    )

    python_node = PythonFuncNodeType(python_config)

    # Dynamically create the input model based on the input schema
    python_input_model = python_node.input_model(challenge=train_challenges["007bbfb7"])

    # Execute the Python function node
    python_output = await python_node(python_input_model)

    # Call the LLM node
    attempt_1 = await llm_node(llm_input)
    attempt_2 = await llm_node(llm_input)

    predicted_solutions: Dict[str, List[Dict[str, List[List[int]]]]] = defaultdict(list)
    predicted_solutions["007bbfb7"] = [
        {
            "attempt_1": attempt_1.solution,
            "attempt_2": attempt_2.solution,
        }
    ]
    score = score_submission(predicted_solutions, train_solutions)
    print(score)


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
