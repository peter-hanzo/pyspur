import argparse
from typing import Dict
from load_data import load_train_eval_test_data
from config.display import add_display_args
from config.prompt import add_prompt_args
from config.render import add_render_args
from permutations import ALL_PERMUTATION_INDICES


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


def main() -> None:
    args = parse_args()

    train_data_by_name_d, eval_data_by_name_d, test_data_by_name_d = (
        load_train_eval_test_data(args.grid_representation)
    )


if __name__ == "__main__":
    main()
