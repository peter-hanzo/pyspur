import argparse


def add_display_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--use-diff-highlight",
        action="store_true",
        help="Enable use of diff highlight.",
    )
    parser.add_argument(
        "--use-diff-triangles",
        action="store_true",
        help="Enable use of diff triangles.",
    )
    parser.add_argument(
        "--ascii-separator", type=str, default="|", help="Set the ASCII separator."
    )
    parser.add_argument(
        "--spreadsheet-ascii", action="store_true", help="Enable spreadsheet ASCII."
    )
    parser.add_argument(
        "--spreadsheet-ascii-full",
        action="store_true",
        help="Enable full spreadsheet ASCII.",
    )
    parser.add_argument(
        "--spreadsheet-ascii-show-diff-if-concise",
        action="store_true",
        help="Show diff if concise in spreadsheet ASCII.",
    )
    parser.add_argument(
        "--hacky-allow-size-mismatch-input-output",
        action="store_true",
        help="Allow size mismatch between input and output.",
    )
    parser.add_argument(
        "--disable-absolute-in-normalized-ascii",
        action="store_true",
        help="Disable absolute in normalized ASCII.",
    )
    parser.add_argument(
        "--max-allowed-tokens-per-color",
        type=int,
        default=200,
        help="Set max allowed tokens per color.",
    )
    parser.add_argument(
        "--max-allowed-tokens-full-ascii-grid",
        type=int,
        help="Set max allowed tokens for full ASCII grid.",
    )
    parser.add_argument(
        "--connected-include-diagonals",
        action="store_true",
        help="Include diagonals in connected components.",
    )
