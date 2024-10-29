import argparse


def add_prompt_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--name", type=str, default="default", help="Set the name for PromptArgs."
    )
    parser.add_argument(
        "--additional-info-in-system",
        action="store_true",
        help="Include additional info in system.",
    )
    parser.add_argument(
        "--use-spreadsheet-if-eq-size-and-change-prompt-otherwise",
        action="store_true",
        help="Use spreadsheet if equal size and change prompt otherwise.",
    )
    parser.add_argument(
        "--just-reasoning-additional-info-in-system",
        action="store_true",
        help="Include just reasoning additional info in system.",
    )
    parser.add_argument(
        "--just-attributes-additional-info-in-system",
        action="store_true",
        help="Include just attributes additional info in system.",
    )
    parser.add_argument(
        "--emphasize-long-in-system",
        action="store_true",
        help="Emphasize long in system.",
    )
    parser.add_argument(
        "--shuffle-example-order-with-permutation-index",
        type=int,
        help="Shuffle example order with permutation index.",
    )
    parser.add_argument(
        "--system-use-resolve-ambiguity",
        action="store_true",
        help="Use resolve ambiguity in system.",
    )
    parser.add_argument(
        "--system-use-multi-part-transformation-rule-hint",
        action="store_true",
        help="Use multi-part transformation rule hint in system.",
    )
    parser.add_argument(
        "--use-multi-part-transformation-rule-hint-on-user-call",
        action="store_true",
        help="Use multi-part transformation rule hint on user call.",
    )
    parser.add_argument(
        "--system-use-explain-connected",
        action="store_true",
        help="Use explain connected in system.",
    )
