import argparse
from typing import Optional


def add_render_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--cell-size", type=int, default=40, help="Size of each cell.")
    parser.add_argument(
        "--use-border", action="store_true", help="Use border in rendering."
    )
    parser.add_argument(
        "--use-larger-edges", action="store_true", help="Use larger edges in rendering."
    )
    parser.add_argument(
        "--use-alt-color-scheme",
        action="store_true",
        help="Use alternative color scheme.",
    )
    parser.add_argument(
        "--force-high-res", action="store_true", help="Force high resolution rendering."
    )
    parser.add_argument(
        "--force-edge-size", type=int, help="Force a specific edge size."
    )
    parser.add_argument(
        "--lower-cell-size-on-bigger-to",
        type=int,
        help="Lower cell size on bigger to a specific value.",
    )
    # parser.add_argument('--avoid-edge-around-border', action='store_true', help='Avoid edge around border.')
