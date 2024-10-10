import argparse
import asyncio
import json
from typing import Dict

from dotenv import load_dotenv
from examples.arc.config.display import add_display_args
from examples.arc.config.prompt import add_prompt_args
from examples.arc.config.render import add_render_args
from examples.arc.load_data import load_train_eval_test_data
from node_types.llm import (
    BasicLLMNodeConfig,
    BasicLLMNodeInput,
    BasicLLMNodeType,
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
    train_data_by_name_d, _, _ = load_train_eval_test_data(args)

    # Configure the LLM node
    config = BasicLLMNodeConfig(
        llm_name=ModelName.GPT_4O_MINI,
        max_tokens=1000,
        temperature=0.5,
        json_mode=False,
        system_prompt=TRIVIAL_PROMPT,
    )

    # Create an instance of the LLM node
    llm_node = BasicLLMNodeType(config)

    # Prepare the input data
    input_data = BasicLLMNodeInput(
        user_message=json.dumps(train_data_by_name_d["007bbfb7"])
    )

    # Call the LLM node
    output = await llm_node(input_data)

    # Print the output
    print(output.assistant_message)


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
