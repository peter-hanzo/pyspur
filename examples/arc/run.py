import argparse
from typing import Dict
from load_data import load_train_eval_test_data
from config.display import add_display_args
from config.prompt import add_prompt_args
from config.render import add_render_args


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


def transform_data(data: Dict, grid_representation: str) -> Dict:
    if grid_representation == "pixels":
        return data
    elif grid_representation == "ascii":
        return data
    elif grid_representation == "hybrid":
        return data
    else:
        raise ValueError(f"Invalid grid representation: {grid_representation}")


def main() -> None:
    args = parse_args()

    train_data_by_name_d, eval_data_by_name_d, test_data_by_name_d = (
        load_train_eval_test_data()
    )

    print(f"Grid representation selected: {args.grid_representation}")

    transformed_train_data = transform_data(
        train_data_by_name_d, args.grid_representation
    )
    transformed_eval_data = transform_data(
        eval_data_by_name_d, args.grid_representation
    )
    transformed_test_data = transform_data(
        test_data_by_name_d, args.grid_representation
    )


if __name__ == "__main__":
    main()
