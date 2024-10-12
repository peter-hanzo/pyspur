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
    StructuredOutputLLMNodeConfig,
    StructuredOutputLLMNodeInput,
    StructuredOutputLLMNodeType,
    ModelName,
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
    config = StructuredOutputLLMNodeConfig(
        llm_name=ModelName.GPT_4O_MINI,
        max_tokens=1000,
        temperature=0.8,
        system_prompt=TRIVIAL_PROMPT,
        output_schema={"solution": "list[list[int]]"},
    )

    # Create an instance of the LLM node
    llm_node = StructuredOutputLLMNodeType(config)

    # Prepare the input data
    input_data = StructuredOutputLLMNodeInput(
        user_message=json.dumps(train_challenges["007bbfb7"])
    )

    # Call the LLM node
    attempt_1 = await llm_node(input_data)
    attempt_2 = await llm_node(input_data)

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
