import base64
from collections import defaultdict
from io import BytesIO
from typing import Optional

import attrs
import numpy as np
import tiktoken
from PIL import Image
from scipy.ndimage import generate_binary_structure, label

# Define the exact color scheme (0-9) as RGB tuples
color_scheme_consts = {
    0: (0, 0, 0),  # Black
    1: (0, 116, 217),  # Blue
    2: (128, 0, 128),  # Purple
    3: (46, 204, 64),  # Green
    4: (255, 220, 0),  # Yellow
    5: (170, 170, 170),  # Grey
    6: (240, 18, 190),  # Fuchsia
    7: (255, 133, 27),  # Orange
    8: (127, 219, 255),  # Teal
    9: (135, 12, 37),  # Brown
}

invalid_color = (255, 255, 255)  # White

tokenizer = tiktoken.encoding_for_model("gpt-4o")

@attrs.frozen
class StdoutStderr:
    stdout: str
    stderr: str


color_scheme_consts_name = {
    0: "black",
    1: "blue",
    2: "purple",
    3: "green",
    4: "yellow",
    5: "grey",
    6: "fuchsia",
    7: "orange",
    8: "teal",
    9: "brown",
}

alt_color_scheme_consts_name = {
    0: "black",
    1: "blue",
    2: "red",
    3: "green",
    4: "yellow",
    5: "grey",
    6: "pink",
    7: "orange",
    8: "purple",
    9: "brown",
}

alt_color_scheme_consts = {
    0: (0, 0, 0),  # Black
    1: (0, 40, 230),  # Blue
    2: (230, 20, 20),  # Red
    3: (46, 204, 64),  # Green
    4: (255, 255, 0),  # Yellow
    5: (170, 170, 170),  # Grey
    6: (255, 0, 195),  # Pink
    7: (255, 133, 27),  # Orange
    8: (128, 0, 128),  # Purple
    9: (139, 69, 19),  # Brown
}

color_scheme = defaultdict(lambda: invalid_color, color_scheme_consts)
color_scheme_name = defaultdict(lambda: "invalid_color", color_scheme_consts_name)


alt_color_scheme = defaultdict(lambda: invalid_color, alt_color_scheme_consts)
alt_color_scheme_name = defaultdict(
    lambda: "invalid_color", alt_color_scheme_consts_name
)

edge_color = (85, 85, 85)  # Grey edge color
white = (255, 255, 255)  # White

highlight_color = (255, 0, 0)  # Red


@attrs.frozen
class RenderArgs:
    cell_size: int = 40
    use_border: bool = False
    use_larger_edges: bool = True
    use_alt_color_scheme: bool = False
    force_high_res: bool = False
    force_edge_size: Optional[int] = None
    lower_cell_size_on_bigger_to: Optional[int] = None
    # avoid_edge_around_border: bool = False


def create_rgb_grid(
    grid: np.ndarray,
    render_args: RenderArgs = RenderArgs(),
    should_highlight: Optional[np.ndarray] = None,
    lower_right_triangle: Optional[np.ndarray] = None,
):

    this_color_scheme = (
        alt_color_scheme if render_args.use_alt_color_scheme else color_scheme
    )

    height, width = grid.shape

    cell_size = render_args.cell_size
    use_border = render_args.use_border
    use_larger_edges = render_args.use_larger_edges
    force_edge_size = render_args.force_edge_size
    # avoid_edge_around_border = render_args.avoid_edge_around_border

    if render_args.lower_cell_size_on_bigger_to is not None and (
        height > 10 or width > 10
    ):
        cell_size = render_args.lower_cell_size_on_bigger_to

    if force_edge_size is not None:
        edge_size = force_edge_size
    else:
        edge_size = max(cell_size // 8, 1) if use_larger_edges else 1

    # Calculate the size of the new grid with edges
    new_height = height * (cell_size + edge_size) + edge_size
    new_width = width * (cell_size + edge_size) + edge_size

    # Create a new grid filled with the edge color
    rgb_grid = np.full((new_height, new_width, 3), edge_color, dtype=np.uint8)

    # Fill in the cells with the appropriate colors
    for i in range(height):
        for j in range(width):
            color = this_color_scheme[grid[i, j]]
            start_row = i * (cell_size + edge_size) + edge_size
            start_col = j * (cell_size + edge_size) + edge_size

            if should_highlight is not None and should_highlight[i, j]:
                rgb_grid[
                    start_row : start_row + cell_size, start_col : start_col + cell_size
                ] = highlight_color
                highlight_width = cell_size // 8
                rgb_grid[
                    start_row
                    + highlight_width : start_row
                    + cell_size
                    - highlight_width,
                    start_col
                    + highlight_width : start_col
                    + cell_size
                    - highlight_width,
                ] = color

                assert (
                    lower_right_triangle is None
                ), "Can't highlight and lower right triangle at the same time (yet)"

            else:
                rgb_grid[
                    start_row : start_row + cell_size, start_col : start_col + cell_size
                ] = color

                if lower_right_triangle is not None:
                    lower_right_triangle_color = this_color_scheme[
                        lower_right_triangle[i, j]
                    ]
                    for r in range(cell_size):
                        for c in range(cell_size):
                            if r > c:
                                rgb_grid[
                                    start_row + r, start_col + cell_size - 1 - c
                                ] = lower_right_triangle_color

    # if avoid_edge_around_border:
    #     return rgb_grid[
    #         edge_size : new_height - edge_size, edge_size : new_width - edge_size
    #     ]

    if not use_border:
        return rgb_grid

    rgb_grid_border = np.full(
        (new_height + cell_size, new_width + cell_size, 3), white, dtype=np.uint8
    )
    assert cell_size % 2 == 0
    rgb_grid_border[
        cell_size // 2 : new_height + cell_size // 2,
        cell_size // 2 : new_width + cell_size // 2,
    ] = rgb_grid

    return rgb_grid_border


def grid_to_pil(
    grid: np.ndarray,
    render_args: RenderArgs = RenderArgs(),
    should_highlight: Optional[np.ndarray] = None,
    lower_right_triangle: Optional[np.ndarray] = None,
):
    rgb_grid = create_rgb_grid(
        grid,
        render_args=render_args,
        should_highlight=should_highlight,
        lower_right_triangle=lower_right_triangle,
    )
    return Image.fromarray(rgb_grid, "RGB")


def grid_to_base64_png(
    grid: np.ndarray,
    render_args: RenderArgs = RenderArgs(),
    should_highlight: Optional[np.ndarray] = None,
    lower_right_triangle: Optional[np.ndarray] = None,
):
    image = grid_to_pil(
        grid,
        render_args=render_args,
        should_highlight=should_highlight,
        lower_right_triangle=lower_right_triangle,
    )

    output = BytesIO()
    image.save(output, format="PNG")
    return base64.b64encode(output.getvalue()).decode("utf-8")


def grid_to_base64_png_oai_content(
    grid: np.ndarray,
    render_args: RenderArgs = RenderArgs(),
    should_highlight: Optional[np.ndarray] = None,
    lower_right_triangle: Optional[np.ndarray] = None,
):
    base64_png = grid_to_base64_png(
        grid,
        render_args=render_args,
        should_highlight=should_highlight,
        lower_right_triangle=lower_right_triangle,
    )

    # rgb_grid_for_shape = create_rgb_grid(
    #     grid,
    #     render_args=render_args,
    #     should_highlight=should_highlight,
    #     lower_right_triangle=lower_right_triangle,
    # )

    extra = {"detail": "high"} if render_args.force_high_res else {}

    # print(f"{rgb_grid_for_shape.shape=}")

    # NOTE: we currently use "auto". Seems fine for now I think...
    return {
        "type": "image_url",
        "image_url": {
            "url": f"data:image/png;base64,{base64_png}",
            **extra,
        },
    }


def show_grid(
    grid: np.ndarray,
    render_args: RenderArgs = RenderArgs(),
    should_highlight: Optional[np.ndarray] = None,
    lower_right_triangle: Optional[np.ndarray] = None,
):
    grid_to_pil(
        grid,
        render_args=render_args,
        should_highlight=should_highlight,
        lower_right_triangle=lower_right_triangle,
    ).show()


# # Example usage
# initial_values = np.array([[1, 1, 2], [2, 3, 5], [0, 2, 1]])

# rgb_grid = create_rgb_grid(initial_values, cell_size=10)

# image = Image.fromarray(rgb_grid, "RGB")
# image.show()


#################### ASCII ####################


@attrs.frozen
class DisplayArgs:
    render_args: RenderArgs = RenderArgs()
    use_diff_highlight: bool = False
    use_diff_triangles: bool = False
    ascii_separator: str = "|"
    spreadsheet_ascii: bool = False
    spreadsheet_ascii_full: bool = False
    spreadsheet_ascii_show_diff_if_concise: bool = False
    hacky_allow_size_mismatch_input_output: bool = False
    disable_absolute_in_normalized_ascii: bool = False
    max_allowed_tokens_per_color: Optional[int] = 200
    max_allowed_tokens_full_ascii_grid: Optional[int] = None
    connected_include_diagonals: bool = False


spreadsheet_col_labels = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "AA",
    "AB",
    "AC",
    "AD",
]


def spreadsheet_ascii_grid(grid: np.ndarray, separator: str = "|"):
    rows, cols = grid.shape
    assert cols <= 30
    assert rows <= 30

    cols_header_line = separator.join([" "] + spreadsheet_col_labels[:cols])
    rest = "\n".join(
        separator.join([str(i + 1)] + [str(x) for x in row])
        for i, row in enumerate(grid)
    )

    return f"{cols_header_line}\n{rest}"


def get_spreadsheet_notation_str(i, j, quote: bool = True):
    out = f"{spreadsheet_col_labels[j]}{i+1}"
    if quote:
        out = f'"{out}"'
    return out


def spreadsheet_ascii_grid_as_color_by_location(grid: np.ndarray):
    rows, cols = grid.shape
    assert cols <= 30
    assert rows <= 30

    out = "\n".join(
        "|".join(
            f"{grid[i, j]} {get_spreadsheet_notation_str(i, j,quote=False)}"
            for j in range(cols)
        )
        for i in range(rows)
    )

    return out


def get_spreadsheet_notation_support_runs(rows_cols: list[tuple[int, int]]):
    row_cols_v = np.array(sorted(rows_cols, key=lambda x: (x[0], x[1])))

    running_str = ""

    idx = 0
    while idx < len(row_cols_v):
        r, c = row_cols_v[idx]

        count_in_a_row = 0
        for checking_idx, (n_r, n_c) in enumerate(row_cols_v[idx:]):
            if n_r == r and n_c == c + checking_idx:
                count_in_a_row += 1
            else:
                break

        if count_in_a_row > 4:
            start = get_spreadsheet_notation_str(r, c, quote=False)
            c_end = c + count_in_a_row - 1

            assert np.array_equal(row_cols_v[idx + count_in_a_row - 1], (r, c_end)), (
                row_cols_v[idx + count_in_a_row - 1],
                (r, c_end),
            )

            end = get_spreadsheet_notation_str(r, c_end, quote=False)

            running_str += f" {start} ... {end}"
            idx += count_in_a_row
        else:
            running_str += " " + get_spreadsheet_notation_str(r, c, quote=False)
            idx += 1

    return running_str


def find_contiguous_shapes(grid, color):
    labeled_array, num_features = label(grid == color)
    shapes = []
    for i in range(1, num_features + 1):
        shapes.append(np.argwhere(labeled_array == i))
    return shapes


# version with diagonals
def find_contiguous_shapes_moore(grid, color):
    s = generate_binary_structure(2, 2)
    labeled_array, num_features = label(grid == color, structure=s)
    shapes = []
    for i in range(1, num_features + 1):
        shapes.append(np.argwhere(labeled_array == i))
    return shapes


def spreadsheet_ascii_grid_by_color_contiguous(
    shapes_by_color,
    use_alt_color_scheme: bool = True,
    max_allowed_tokens_per_color: Optional[int] = None,
):
    # TODO: support alt color scheme
    out = ""
    was_color_omitted = {}
    for color in range(11):
        was_color_omitted[color] = False
        contiguous_shapes = shapes_by_color[color]
        if len(contiguous_shapes) == 0:
            continue

        color_str = "|".join(
            get_spreadsheet_notation_support_runs(list(shape))
            for shape in contiguous_shapes
        )

        if (
            max_allowed_tokens_per_color is not None
            and len(tokenizer.encode(color_str)) > max_allowed_tokens_per_color
        ):
            color_str = " [OMITTED DUE TO EXCESSIVE LENGTH]"
            was_color_omitted[color] = True

        out += (
            f"{(alt_color_scheme_name if use_alt_color_scheme else color_scheme_name)[color]} ({color}):{color_str}"
        ) + "\n"

    return out, was_color_omitted


def diff_is_concise(grid_input: np.ndarray, grid_output: np.ndarray):
    if grid_input.shape != grid_output.shape:
        return False

    differs = grid_input != grid_output
    count_differs = differs.sum()
    if count_differs > 50 and (
        count_differs > 0.35 * grid_input.size or count_differs > 150
    ):
        return False

    grid_differs_x, grid_differs_y = differs.nonzero()

    all_color_pairs = set()
    for x, y in zip(grid_differs_x.tolist(), grid_differs_y.tolist()):
        all_color_pairs.add((grid_input[x, y], grid_output[x, y]))

    if len(all_color_pairs) > 8:
        return False

    return True


def always_diff_is_concise(list_of_inputs_and_outputs: list[dict[str, np.ndarray]]):
    for item in list_of_inputs_and_outputs:
        if not diff_is_concise(item["input"], item["output"]):
            return False
    return True


def spreadsheet_ascii_grid_by_color_diffs(
    grid_input: np.ndarray,
    grid_output: np.ndarray,
    use_alt_color_scheme: bool = True,
    use_expected_vs_got: bool = False,
):
    assert grid_input.shape == grid_output.shape
    grid_differs_x, grid_differs_y = (grid_input != grid_output).nonzero()
    differences_by_color_pairs: dict[tuple[int, int], list[tuple[int, int]]] = (
        defaultdict(list)
    )
    for x, y in zip(grid_differs_x.tolist(), grid_differs_y.tolist()):
        differences_by_color_pairs[
            (int(grid_input[x, y]), int(grid_output[x, y]))
        ].append((int(x), int(y)))

    out = ""
    for (color_input, color_output), differing_locs in sorted(
        differences_by_color_pairs.items(), key=lambda x: x[0]
    ):
        color_str = get_spreadsheet_notation_support_runs(differing_locs)

        scheme = alt_color_scheme_name if use_alt_color_scheme else color_scheme_name

        if use_expected_vs_got:
            out += (
                f"Expected {scheme[color_input]} ({color_input}) but got {scheme[color_output]} ({color_output}):{color_str}"
            ) + "\n"

        else:
            out += (
                f"{scheme[color_input]} ({color_input}) to {scheme[color_output]} ({color_output}):{color_str}"
            ) + "\n"

    return out


def spreadsheet_ascii_grid_by_color_contiguous_normalized(
    shapes_by_color,
    use_alt_color_scheme: bool = True,
    omit_by_color: Optional[dict[int, bool]] = None,
    disable_absolute_in_normalized_ascii: bool = False,
):
    # TODO: support alt color scheme
    out = ""

    for color in range(11):
        contiguous_shapes = shapes_by_color[color]
        if len(contiguous_shapes) == 0:
            continue

        shape_strs: list[str] = []
        for shape in contiguous_shapes:
            min_i = min(i for i, j in shape)
            min_j = min(j for i, j in shape)
            # basic = ",".join(
            #     get_spreadsheet_notation_str(i - min_i, j - min_j, quote=False)
            #     for i, j in
            # )

            normalized = [
                (i - min_i, j - min_j)
                for i, j in sorted(shape, key=lambda x: (int(x[0]), int(x[1])))
            ]

            basic_shape_str = get_spreadsheet_notation_support_runs(normalized)

            if len(shape) > 2 and not disable_absolute_in_normalized_ascii:
                shape_str = (
                    " [Absolute: "
                    + get_spreadsheet_notation_str(
                        shape[0][0], shape[0][1], quote=False
                    )
                    + "]"
                    + basic_shape_str
                )
            else:
                shape_str = basic_shape_str

            shape_strs.append(shape_str)

        color_str = "|".join(shape_strs)

        if omit_by_color is not None and omit_by_color.get(color, False):
            color_str = " [OMITTED DUE TO EXCESSIVE LENGTH]"

        out += (
            f"{(alt_color_scheme_name if use_alt_color_scheme else color_scheme_name)[color]} ({color}):{color_str}"
        ) + "\n"

    return out


def spreadsheet_ascii_grid_by_color_contiguous_absolute_small_shapes(
    overall_rows: int,
    overall_cols: int,
    shapes_by_color,
    use_alt_color_scheme: bool = True,
    separator: str = "|",
):
    overall_out = ""
    any_ever_used = False
    for color in range(11):
        contiguous_shapes = shapes_by_color[color]
        if len(contiguous_shapes) == 0:
            continue
        this_str = f"Color: {color}\n\n"

        any_used = False
        for shape_idx, shape in enumerate(contiguous_shapes):
            min_i = min(i for i, j in shape)
            min_j = min(j for i, j in shape)

            absolute_shifted_shape = [(i - min_i, j - min_j) for i, j in shape]

            n_rows = max(i for i, j in absolute_shifted_shape) + 1
            n_cols = max(j for i, j in absolute_shifted_shape) + 1

            if (
                (n_rows > overall_rows // 2 and n_cols > overall_cols // 2)
                or n_rows * n_cols > 50
                or n_rows * n_cols == 1
            ):
                continue

            any_used = True
            any_ever_used = True

            assert n_rows <= 30
            assert n_rows <= 30

            cols_header_line = separator.join([" "] + spreadsheet_col_labels[:n_cols])

            grid_labels = np.full((n_rows, n_cols), fill_value="O", dtype=object)

            for i, j in absolute_shifted_shape:
                grid_labels[i, j] = "X"

            rest = "\n".join(
                separator.join([str(i)] + [str(x) for x in row])
                for i, row in enumerate(grid_labels)
            )

            this_str += f'"shape_{shape_idx}_with_color_{(alt_color_scheme_name if use_alt_color_scheme else color_scheme_name)[color]}_{color}":\n\n'
            this_str += f"Bounding box shape: {n_rows} by {n_cols}\n\n"

            this_str += f"{cols_header_line}\n{rest}\n\n"

            this_str += (
                f"Normalized locations: ["
                + ", ".join(
                    get_spreadsheet_notation_str(i, j)
                    for i, j in absolute_shifted_shape
                )
                + "]\n\n"
            )

        if any_used:
            overall_out += this_str

    if not any_ever_used:
        return None

    return overall_out


def ascii_grid(grid: np.ndarray, separator: str = "|", spreadsheet_ascii: bool = False):
    if spreadsheet_ascii:
        return spreadsheet_ascii_grid(grid, separator=separator)

    return "\n".join(separator.join(str(x) for x in row) for row in grid)


def display_single_grid_alt(
    item: list[list[int]],
    display_args: DisplayArgs = DisplayArgs(),
    extra_shape_text: str = "",
):
    grid = np.array(item)
    x, y = grid.shape

    shape_text = f"Shape: {x} by {y}{extra_shape_text}\n\n"

    use_header_text = display_args.spreadsheet_ascii_full

    header_text = "### " if use_header_text else ""

    if not display_args.spreadsheet_ascii_full:
        ascii_text = (
            header_text
            + f"ASCII representation:\n\n{ascii_grid(grid, separator=display_args.ascii_separator, spreadsheet_ascii=display_args.spreadsheet_ascii)}\n\n"
        )
    else:
        assert display_args.spreadsheet_ascii
        assert display_args.spreadsheet_ascii_full
        color_by_loc_rep = spreadsheet_ascii_grid_as_color_by_location(grid)
        if (
            display_args.max_allowed_tokens_full_ascii_grid is not None
            and len(tokenizer.encode(color_by_loc_rep))
            > display_args.max_allowed_tokens_full_ascii_grid
        ):
            color_by_loc_rep = "[OMITTED DUE TO EXCESSIVE LENGTH]"
        ascii_text = f"### Color by location representation\n\n{color_by_loc_rep}\n\n"

        shapes_by_color = {
            color: (
                find_contiguous_shapes_moore
                if display_args.connected_include_diagonals
                else find_contiguous_shapes
            )(grid, color)
            for color in range(11)
        }

        out_text_by_color, was_color_omitted = (
            spreadsheet_ascii_grid_by_color_contiguous(
                shapes_by_color,
                use_alt_color_scheme=display_args.render_args.use_alt_color_scheme,
                max_allowed_tokens_per_color=display_args.max_allowed_tokens_per_color,
            )
        )

        ascii_text += f"### Location by color representation\n\n{out_text_by_color}\n\n"
        normalized_by_color_contiguous = spreadsheet_ascii_grid_by_color_contiguous_normalized(
            shapes_by_color,
            use_alt_color_scheme=display_args.render_args.use_alt_color_scheme,
            omit_by_color=was_color_omitted,
            disable_absolute_in_normalized_ascii=display_args.disable_absolute_in_normalized_ascii,
        )
        ascii_text += f"""### Normalized shape representation (by color)\n\n{normalized_by_color_contiguous}\n\n"""

    out = [
        {
            "type": "text",
            "text": shape_text
            + ("### Image representation\n\n" if use_header_text else ""),
        },
        grid_to_base64_png_oai_content(grid, render_args=display_args.render_args),
        {
            "type": "text",
            "text": ascii_text,
        },
    ]

    return out


def display_example_alt(
    item_idx: int,
    item: dict[str, list[list[int]]],
    display_args: DisplayArgs = DisplayArgs(),
):
    fmt_num = item_idx + 1
    out = [
        {
            "type": "text",
            "text": f"# Example {fmt_num}\n\n## Input {fmt_num}\n\n",
        },
        *display_single_grid_alt(
            item["input"],
            display_args=display_args,
        ),
        {"type": "text", "text": f"## Output {fmt_num}\n\n"},
        *display_single_grid_alt(
            item["output"],
            display_args=display_args,
        ),
    ]

    if (
        display_args.spreadsheet_ascii_full
        and display_args.spreadsheet_ascii_show_diff_if_concise
    ):

        inp_grid, out_grid = np.array(item["input"]), np.array(item["output"])

        if inp_grid.shape == out_grid.shape or (
            not display_args.hacky_allow_size_mismatch_input_output
        ):
            assert inp_grid.shape == out_grid.shape

            color_changes = spreadsheet_ascii_grid_by_color_diffs(
                grid_input=inp_grid,
                grid_output=out_grid,
                use_alt_color_scheme=display_args.render_args.use_alt_color_scheme,
            )

            if not diff_is_concise(np.array(item["input"]), np.array(item["output"])):
                color_changes = "[OMITTED DUE TO EXCESSIVE LENGTH]"
        else:
            # vanity asserts
            assert display_args.hacky_allow_size_mismatch_input_output
            assert inp_grid.shape != out_grid.shape

            color_changes = "[OMITTED DUE TO SHAPE MISMATCH]"

        out.append(
            {
                "type": "text",
                "text": f"### Color changes between the input grid and the output grid\n\n{color_changes}\n\n",
            }
        )

    input_grid = np.array(item["input"])
    output_grid = np.array(item["output"])

    valid_diff = input_grid.shape == output_grid.shape and (
        np.sum(input_grid == output_grid) / input_grid.size > 0.6
    )

    if display_args.use_diff_highlight and valid_diff:
        to_highlight = input_grid != output_grid
        out.extend(
            [
                {
                    "type": "text",
                    "text": f"## Input {fmt_num} with cells that differ (from Output {fmt_num}) highlighted with a red border\n\n",
                },
                grid_to_base64_png_oai_content(
                    input_grid,
                    render_args=display_args.render_args,
                    should_highlight=to_highlight,
                ),
                {
                    "type": "text",
                    "text": f"## Output {fmt_num} with cells that differ (from Input {fmt_num}) highlighted with a red border\n\n",
                },
                grid_to_base64_png_oai_content(
                    output_grid,
                    render_args=display_args.render_args,
                    should_highlight=to_highlight,
                ),
            ]
        )

    if display_args.use_diff_triangles and valid_diff:
        out.extend(
            [
                {
                    "type": "text",
                    "text": f"## The Input {fmt_num} color is in the upper left triangle and the Output {fmt_num} color is in the lower right triangle\n\n",
                },
                grid_to_base64_png_oai_content(
                    input_grid,
                    render_args=display_args.render_args,
                    lower_right_triangle=output_grid,
                ),
            ]
        )

    return out


def display_wrong_output_alt(
    item_idx: int,
    item: Optional[list[list[int]]],
    expected_output: list[list[int]],
    stdout_stderr: StdoutStderr,
    display_args: DisplayArgs = DisplayArgs(),
    use_output_diff: bool = True,
):
    expected_shape = np.array(expected_output).shape
    x_expected, y_expected = expected_shape

    fmt_num = item_idx + 1

    basic_title = f"# Example {fmt_num}\n\n## Output for Example {fmt_num} from the incorrect `transform` function (aka actual output)\n\n"

    if stdout_stderr.stdout == "" and stdout_stderr.stderr == "":
        stdout_stderr_text = " stdout and stderr were empty."
    else:
        stdout_stderr_text = f"\n\nHere are the stdout and stderr of the function for this example:\n\n<stdout>\n{stdout_stderr.stdout}\n</stdout>\n\n<stderr>{stdout_stderr.stderr}</stderr>"

    if item == expected_output:
        return [
            {
                "type": "text",
                "text": basic_title
                + f"The output matches the expected output. (It is correct.){stdout_stderr_text}\n\n",
            }
        ]

    if item is None:
        return [
            {
                "type": "text",
                "text": basic_title
                + f"There was an error when running the function on this input.{stdout_stderr_text}\n\n",
            }
        ]

    has_some_invalid = any(not (0 <= x <= 9) for row in item for x in row)

    invalid_text = "Note that the output contains some invalid values (values that are not between 0 and 9 inclusive). These invalid values are incorrect and will need to be fixed. Invalid values are displayed in white in the image representation and the actual (invalid) value is displayed in the ASCII representation.\n\n"
    if not has_some_invalid:
        invalid_text = ""

    actual_shape = np.array(item).shape

    # TODO: diff text!!!

    grid_expected = np.array(expected_output)
    grid_actual = np.array(item)

    out = [
        {
            "type": "text",
            "text": basic_title + invalid_text + stdout_stderr_text.strip() + "\n\n",
        },
        *display_single_grid_alt(
            item,
            display_args=display_args,
            extra_shape_text=(
                f" (Shape differs from expected shape. The expected shape is: {x_expected} by {y_expected}.)"
                if actual_shape != expected_shape
                else ""
            ),
        ),
        {
            "type": "text",
            "text": "## Expected Output\n\n",
        },
        *display_single_grid_alt(
            expected_output,
            display_args=display_args,
        ),
    ]

    if use_output_diff:
        if grid_expected.shape != grid_actual.shape:
            color_changes = " [OMITTED DUE TO SHAPE MISMATCH]"
        elif not diff_is_concise(grid_input=grid_expected, grid_output=grid_actual):
            color_changes = " [OMITTED DUE TO EXCESSIVE LENGTH]"
        else:
            color_changes = spreadsheet_ascii_grid_by_color_diffs(
                grid_input=grid_expected,
                grid_output=grid_actual,
                use_alt_color_scheme=display_args.render_args.use_alt_color_scheme,
                use_expected_vs_got=True,
            )

        diff_rep_for_actual_expected = f"""## Color differences between the expected output and the actual output\n\n{color_changes}\n\n"""
        out.append(
            {
                "type": "text",
                "text": diff_rep_for_actual_expected,
            },
        )

    return out
