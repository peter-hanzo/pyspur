from collections import Counter, defaultdict
import json
import math
import hashlib
from functools import cache
import os
import io
import contextlib
from typing import Any, Callable, Optional, TypeVar
import base64
import asyncio
import itertools

from scipy.ndimage import label, generate_binary_structure
import attrs
import numpy as np
import openai
import nest_asyncio
import tiktoken

from rrutils.llm_api.base_llm import ContextLengthExceeded, LLMResponse

nest_asyncio.apply()

from arc_solve.edit_distance import get_rank_geo_mean_score

from feature_engineering import (
    RenderArgs,
    grid_to_base64_png_oai_content,
    color_scheme_name,
    alt_color_scheme_name,
    alt_color_scheme_consts_name,
    color_scheme_consts_name,
)
from arc_solve.run_programs import (
    KeyNameS,
    RunOutput,
    RunOutputHashable,
    StdoutStderr,
    evaluate_funcs_with_timeout_cache,
)

from prompts_and_examples import (
    reasoning_labeled_items_alt_color,
    reasoning_labeled_items_full_spreadsheet_alt_color,
    reasoning_labeled_change_prompt_alt_color_add_swap,
)
from feature_engineering import DisplayArgs


def normalize_ordering(items: list[LLMResponse]) -> list[LLMResponse]:
    def stable_hash(x: str):
        hasher = hashlib.md5()
        hasher.update(x.encode())
        return hasher.hexdigest()

    return sorted(items, key=lambda x: (-len(x.completion), stable_hash(x.completion)))


def get_alternative_system_prompt(
    use_diff_highlight: bool = False,
    use_diff_triangles: bool = False,
    additional_info: bool = True,
    just_reasoning_additional_info: bool = True,
    just_attributes_additional_info: bool = False,
    use_many_ascii_representations: bool = False,
    use_alt_color_scheme: bool = False,
    disable_absolute_in_normalized_ascii: bool = False,
    long_as_you_want: bool = False,
    use_diff_rep: bool = False,
    use_resolve_ambiguity: bool = True,
    use_multi_part_transformation_rule_hint: bool = False,
    use_explain_connected: bool = False,
    connected_include_diagonals: bool = False,
):
    scheme = (
        alt_color_scheme_consts_name
        if use_alt_color_scheme
        else color_scheme_consts_name
    )

    color_to_index = ", ".join(
        f"{name}: {color_val}" for color_val, name in enumerate((scheme).values())
    )

    many_ascii_rep_and_image_version_of_input_line = f"""The inputs and outputs are each "grids". A grid is a rectangular matrix of integers between 0 and 9 (inclusive). These grids will be shown to you as images and in various ASCII representations. The image and the ASCII representations for each input/output contain the same information: we just show both representations for convenience and ease of understanding. Each number corresponds to a color in the image. The correspondence is as follows: {color_to_index}."""

    abs_in_normalized_ascii_desc = """\n\nFor each shape, we indicate the non-normalized location of one cell in the grid (the first cell per shape in the prior representation) using [Absolute: LOCATION]. This is to make it easy to correspond to the prior representation and to give each shape a unique identification. We only show the absolute representation for shapes with more than 2 cells to save space."""

    if disable_absolute_in_normalized_ascii:
        abs_in_normalized_ascii_desc = ""

    # TODO: there is an extra '"' here due to a typo. Can't always fix due to cache.
    diff_rep = f"""\n\n### Color changes between the input grid and the output grid

This shows the difference between an input grid and an output grid as a list of the locations where one color changes to another. For instance, if {scheme[0]} changes to {scheme[2]} at A1 A2 B7, this would be represented as "{scheme[0]} (0) to {scheme[2]} (2): A1 A2 B7".

We will use the '...' notation as described earlier when applicable."""

    if not use_diff_rep:
        diff_rep = ""

    if connected_include_diagonals:
        explain_connected = " For this connected component representation, we use 8-connectivity (aka Moore neighborhood) where both orthogonally and diagonally adjacent pixels are considered connected. This includes pixels to the up, down, left, right, as well as the four diagonal neighbors (up-left, up-right, down-left, down-right). (Note that this differs from how (e.g.) scipy.ndimage.label treats connected components.)"
    elif use_explain_connected:
        explain_connected = " For this connected component representation, we use 4-connectivity (aka von Neumann neighborhood) where orthogonally adjacent pixels (up, down, left, right) are considered connected. (This matches scipy.ndimage.label.)"
    else:
        explain_connected = ""

    ascii_rep_desc = f"""Here are descriptions of each of the different ASCII representations we will provide:

### Color by location representation

This is a grid of elements separated by '|'. For each element, we provide the color as a number and the location (in that order). Locations are denoted like A7 or D3, where columns are denoted with A, B, C, etc., and rows are denoted with 1, 2, 3, etc. So, D3 corresponds to the cell in the 4th column and the 3rd row. Note that rows are 1-indexed.

### Location by color representation

This is a mapping from colors to the locations at which that color occurs. We use 'XR ... YR' to denote that row R is occupied from X to Y (inclusive). For instance, 'C5 ... G5' would correspond to 'C5 D5 E5 F5 G5'. We only use this '...' notation for moderately long contiguous runs of cells in a row. We don't use this notation for columns.

We also separate the list into connected components (shapes).{explain_connected} Each shape/component is separated by '|'.

### Normalized shape representation (by color)

This shows the geometry of each shape/component by "normalizing" the shape: showing the shape with the coordinates shifted such that the minimum row/column of the shape is row 1 and column A. This is useful for tasks like noticing identical shapes (in different positions with different colors).

Each shape/component is separated by '|'.{abs_in_normalized_ascii_desc}{diff_rep}

Now we're done going through the descriptions of the different ASCII representations.
""".strip()

    image_version_of_input_line = f'The inputs and outputs are each "grids". A grid is a rectangular matrix of integers between 0 and 9 (inclusive). These grids will be shown to you as both images and grids of numbers (ASCII). The image and the grid of numbers for each input/output contain the same information: we just show both representations for convenience. Each number corresponds to a color in the image. The correspondence is as follows: {color_to_index}.'

    maybe_diff_highlight_line = "\n\nWhen the input and output grids have identical dimensions and share the same color in more than 60% of their cells, we will display an additional version of both the input and output grids with cells that differ highlighted using a red border. This highlighting is to help you easily identify the differences between the input and output grids."

    maybe_diff_triangles_line = "\n\nWhen the input and output grids have identical dimensions and share the same color in more than 60% of their cells, we will display an additional image which shows the input color in the upper left triangle of the cell and the output color in the lower right triangle of the cell. Correspondingly, cells which are all one color (the upper triangle and lower triangle are the same color) are cells where the input and the output grids have the same color. This visualization is to help you easily identify and understand the differences between the input and output grids."

    additional_info_line_reasoning = f"""You follow a particular reasoning style. You break down complex problems into smaller parts and reason through them step by step, arriving at sub-conclusions before stating an overall conclusion. This reduces the extent to which you need to do large leaps of reasoning.

You reason in substantial detail for as long as is necessary to {'determine the transformation rule.' if not use_resolve_ambiguity else 'fully determine the transformation rule and resolve any ambiguities/uncertainties.'}"""

    no_need_conside_as_long = "\n\nYour reasoning **can be as long as necessary**! The goal of the reasoning is just to make sure you end up with a correct implementation of the transformation rule, so **there isn't any need for your reasoning to be concise**. You should do any and all reasoning that would be useful."

    if not long_as_you_want:
        no_need_conside_as_long = ""

    additional_info_line_attributes = (
        "You are creative and accomplished at solving puzzles."
    )

    additional_info_line = f"""\n\n{additional_info_line_reasoning}{no_need_conside_as_long}\n\n{additional_info_line_attributes}"""
    # print(additional_info_line)

    if just_reasoning_additional_info:
        additional_info_line = "\n\n" + additional_info_line_reasoning
        assert not just_attributes_additional_info
        assert additional_info
    elif just_attributes_additional_info:
        additional_info_line = "\n\n" + additional_info_line_attributes
        assert additional_info

    if use_many_ascii_representations:
        input_line = many_ascii_rep_and_image_version_of_input_line

        input_line += "\n\n" + ascii_rep_desc
    else:
        input_line = image_version_of_input_line

    if not use_diff_highlight:
        maybe_diff_highlight_line = ""

    if not use_diff_triangles:
        maybe_diff_triangles_line = ""

    if not additional_info:
        additional_info_line = ""

    single_correct_resolve_ambiguity = "\n\nThe transformation rule maps from each input to a single correct output, and your implementation in code must be exactly correct. Thus, you need to resolve all potential uncertainties you might have about the transformation rule. For instance, if the examples always involve some particular color being changed to another color in the output, but which color it is changed to varies between different examples, then you need to figure out what determines the correct output color. As another example, if some shape(s) or cells in the input are relocated or recolored, you need to determine which exact shapes should be relocated/recolored in the output and where they should be moved or what their color in the output should be. Whenever there are potential ambiguities/uncertainties in your current understanding of the transformation rule, you need to resolve them before implementing the transformation in code. You should resolve ambiguities and uncertainties by carefully analyzing the examples and using step by step reasoning."

    multiple_part_transformation_rule_hint = """

The transformation rule might have multiple components and might be fairly complex. It's also reasonably common that the transformation rule has one main rule (e.g., replace cells in XYZ pattern with color ABC), but has some sort of exception (e.g., don't replace cells if they have color DEF). So, you should be on the lookout for additional parts or exceptions that you might have missed so far. Consider explicitly asking yourself (in writing): \"Are there any additional parts or exceptions to the transformation rule that I might have missed?\" (Rules don't necessarily have multiple components or exceptions, but it's common enough that you should consider it.)

Here are some examples of transformation rules with multiple components or exceptions:

- There is a grey grid with black holes that have different shapes and the rule is to fill in these holes with colored cells. Further, the color to use for each hole depends on the size of the hole (in terms of the number of connected cells). 1 cell holes are filled with pink, 2 cell holes are filled with blue, and 3 cell holes are filled with red.
- The output is 3x3 while the input is 3x7. The output has red cells while the input has two "sub-grids" that are 3x3 and separated by a grey line in the middle. Each of the sub-grids has some colored cells (blue) and some black cells. The rule is to AND the two sub-grids together (i.e., take the intersection of where the two sub-grids are blue) and color the 3x3 cells in the output red if they are in the intersection and black otherwise.
- The grey rectangular outlines are filled with some color in the output. Pink, orange, and purple are used to fill in the voids in different cases. The color depends on the size of the black void inside the grey outline where it is pink if the void has 1 cell (1x1 void), orange if the gap has 4 cells, and purple if the gap was 9 cells. For each void, all of the filled-in colors are the same.
- The red shape in the input is moved. It is moved either horizontally or vertically. It is moved until moving it further would intersect with a purple shape. It is moved in the direction of the purple shape, that is, moved in whichever direction would involve it eventually intersecting with this purple shape.

These are just example rules; the actual transformation rule will be quite different. But, this should hopefully give you some sense of what transformation rules might look like.

Note that in each of these cases, you would need to find the rule by carefully examining the examples and using reasoning. You would then need to implement the transformation rule precisely, taking into account all possible cases and getting all of the details right (e.g., exactly where to place various things or exactly which color to use in each case). If the details aren't fully ironed out, you should do additional reasoning to do so before implementing the transformation in code."""

    if not use_resolve_ambiguity:
        single_correct_resolve_ambiguity = ""
    else:
        assert additional_info
        assert not just_attributes_additional_info

    if not use_multi_part_transformation_rule_hint:
        multiple_part_transformation_rule_hint = ""

    alternative_system_prompt_text = f"""You will be given some number of paired example inputs and outputs. The outputs were produced by applying a transformation rule to the inputs. In addition to the paired example inputs and outputs, there is also an additional input without a known output (or possibly multiple additional inputs). Your task is to determine the transformation rule and implement it in code.

{input_line}{maybe_diff_highlight_line}{maybe_diff_triangles_line}{single_correct_resolve_ambiguity}{multiple_part_transformation_rule_hint}

You'll need to carefully reason in order to determine the transformation rule. Start your response by carefully reasoning in <reasoning></reasoning> tags. Then, implement the transformation in code.

After your reasoning, write code in triple backticks (```python and then ```). You should write a function called `transform` which takes a single argument, the input grid as `list[list[int]]`, and returns the transformed grid (also as `list[list[int]]`). You should make sure that you implement a version of the transformation which works in general (for inputs which have the same properties as the example inputs and the additional input(s)).

Don't write tests in your python code, just output the `transform` function.{additional_info_line}"""

    return [
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": alternative_system_prompt_text,
                }
            ],
        },
    ]


@attrs.frozen
class PromptArgs:
    name: str = "default"
    display_args: DisplayArgs = DisplayArgs()
    additional_info_in_system: bool = True
    use_spreadsheet_if_eq_size_and_change_prompt_otherwise: bool = False
    just_reasoning_additional_info_in_system: bool = True
    just_attributes_additional_info_in_system: bool = False
    force_reasoning_labeled_items: Optional[tuple[tuple[str, str], ...]] = (
        None  # tuple for hash
    )
    force_reasoning_labeled_items_spreadsheet_ascii: Optional[
        tuple[tuple[str, str], ...]
    ] = None
    force_reasoning_labeled_items_change_prompt: Optional[
        tuple[tuple[str, str], ...]
    ] = None
    emphasize_long_in_system: bool = False
    shuffle_example_order_with_permutation_index: Optional[int] = None
    system_use_resolve_ambiguity: bool = True
    system_use_multi_part_transformation_rule_hint: bool = False
    use_multi_part_transformation_rule_hint_on_user_call: bool = False
    system_use_explain_connected: bool = False

    def __attrs_post_init__(self):
        if self.use_spreadsheet_if_eq_size_and_change_prompt_otherwise:
            assert self.display_args.spreadsheet_ascii
            assert self.display_args.spreadsheet_ascii_full
            assert self.display_args.render_args.use_alt_color_scheme


@cache
def make_prompt_alt(
    args: PromptArgs = PromptArgs(),
):
    assert (
        not args.use_spreadsheet_if_eq_size_and_change_prompt_otherwise
    ), "this needs to be handled at an earlier stage!"
    basic_prompt = list(
        get_alternative_system_prompt(
            use_diff_highlight=args.display_args.use_diff_highlight,
            use_diff_triangles=args.display_args.use_diff_triangles,
            additional_info=args.additional_info_in_system,
            just_reasoning_additional_info=args.just_reasoning_additional_info_in_system,
            just_attributes_additional_info=args.just_attributes_additional_info_in_system,
            use_many_ascii_representations=args.display_args.spreadsheet_ascii_full,
            use_alt_color_scheme=args.display_args.render_args.use_alt_color_scheme,
            disable_absolute_in_normalized_ascii=args.display_args.disable_absolute_in_normalized_ascii,
            long_as_you_want=args.emphasize_long_in_system,
            use_diff_rep=args.display_args.spreadsheet_ascii_show_diff_if_concise,
            use_resolve_ambiguity=args.system_use_resolve_ambiguity,
            use_multi_part_transformation_rule_hint=args.system_use_multi_part_transformation_rule_hint,
            use_explain_connected=args.system_use_explain_connected,
            connected_include_diagonals=args.display_args.connected_include_diagonals,
        )
    )

    if args.force_reasoning_labeled_items is not None:
        reasoning_labeled_items_here = list(args.force_reasoning_labeled_items)
    elif (
        args.display_args.render_args.use_alt_color_scheme
        and args.display_args.spreadsheet_ascii_full
    ):
        reasoning_labeled_items_here = (
            reasoning_labeled_items_full_spreadsheet_alt_color
        )
    elif args.display_args.render_args.use_alt_color_scheme:
        reasoning_labeled_items_here = reasoning_labeled_items_alt_color
    else:
        assert not args.display_args.render_args.use_alt_color_scheme
        assert not args.display_args.spreadsheet_ascii_full
        assert False

    for name, reasoning in reasoning_labeled_items_here:
        basic_prompt.append(
            {
                "role": "user",
                "content": get_rule_input_alt(
                    name,
                    display_args=args.display_args,
                ),
            }
        )
        basic_prompt.append(
            {
                "role": "assistant",
                "content": reasoning,
            }
        )

    return basic_prompt


@cache
def make_fix_prompt_item(
    name: str,
    all_reasoning_and_outputs: tuple[tuple[str, RunOutputHashable], ...],
    display_args: DisplayArgs = DisplayArgs(),
    use_next_prompt: bool = False,
    use_explicit_start: bool = False,
    use_output_diff: bool = True,
    use_if_fix_fail_line: bool = False,
    shuffle_example_order_with_permutation_index: Optional[int] = None,
    use_fix_reasoning_tags: bool = False,
    use_typical_issue_text: bool = False,
):
    return make_fix_prompt_item_uncache(
        name=name,
        all_reasoning_and_outputs=tuple(
            (reasoning, RunOutput.from_hashable(run_output))
            for reasoning, run_output in all_reasoning_and_outputs
        ),
        display_args=display_args,
        use_next_prompt=use_next_prompt,
        use_explicit_start=use_explicit_start,
        use_output_diff=use_output_diff,
        use_if_fix_fail_line=use_if_fix_fail_line,
        shuffle_example_order_with_permutation_index=shuffle_example_order_with_permutation_index,
        use_fix_reasoning_tags=use_fix_reasoning_tags,
        use_typical_issue_text=use_typical_issue_text,
    )


def make_fix_prompt_item_uncache(
    name: str,
    all_reasoning_and_outputs: tuple[tuple[str, RunOutput], ...],
    display_args: DisplayArgs = DisplayArgs(),
    use_next_prompt: bool = False,
    use_explicit_start: bool = False,
    use_output_diff: bool = True,
    use_if_fix_fail_line: bool = False,
    shuffle_example_order_with_permutation_index: Optional[int] = None,
    use_fix_reasoning_tags: bool = False,
    use_typical_issue_text: bool = False,
):
    (initial_reasoning, initial_run_output), *all_fix_reasoning = (
        all_reasoning_and_outputs
    )

    if use_explicit_start:
        additional_for_prompt = [
            {
                "type": "text",
                "text": "Here are the paired example inputs and outputs. The outputs were produced by applying a transformation rule to the inputs and your task is to determine the transformation rule and implement it in code.\n\nStart your response by carefully reasoning in <reasoning></reasoning> tags. Then, implement the transformation in code.\n\n",
            },
        ]
    else:
        additional_for_prompt = []

    prompt = [
        {
            "role": "user",
            "content": additional_for_prompt
            + get_rule_input_alt(
                name,
                display_args=display_args,
                shuffle_example_order_with_permutation_index=shuffle_example_order_with_permutation_index,
            ),
        },
        {
            "role": "assistant",
            "content": initial_reasoning,
        },
    ]
    fix_prompt_part = [
        {
            "role": "user",
            "content": fix_prompt(
                name,
                initial_run_output,
                display_args=display_args,
                attempt_num=0,
                use_output_diff=use_output_diff,
                use_if_fix_fail_line=use_if_fix_fail_line,
                shuffle_example_order_with_permutation_index=shuffle_example_order_with_permutation_index,
                use_fix_reasoning_tags=use_fix_reasoning_tags,
                use_typical_issue_text=use_typical_issue_text,
            ),
        },
    ]
    if len(all_fix_reasoning) > 0 or use_next_prompt:
        prompt.extend(fix_prompt_part)
    else:
        print("WARNING: no fix reasoning provided!")

    def replace_tags_as_needed_for_fix_reasoning(fix_reasoning: str):
        if not use_fix_reasoning_tags:
            assert "<fix_reasoning>" not in fix_reasoning
            assert "</fix_reasoning>" not in fix_reasoning
            return fix_reasoning

        return fix_reasoning.replace("<reasoning>", "<fix_reasoning>").replace(
            "</reasoning>", "</fix_reasoning>"
        )

    for idx, (reasoning, run_output) in enumerate(all_fix_reasoning):
        prompt.append(
            {
                "role": "assistant",
                "content": replace_tags_as_needed_for_fix_reasoning(reasoning),
            },
        )
        if idx != len(all_fix_reasoning) - 1 or use_next_prompt:
            prompt.append(
                {
                    "role": "user",
                    "content": fix_prompt(
                        name,
                        run_output,
                        display_args=display_args,
                        attempt_num=idx + 1,
                        use_output_diff=use_output_diff,
                        use_if_fix_fail_line=use_if_fix_fail_line,
                        shuffle_example_order_with_permutation_index=shuffle_example_order_with_permutation_index,
                        use_fix_reasoning_tags=use_fix_reasoning_tags,
                        use_typical_issue_text=use_typical_issue_text,
                    ),
                },
            )

    return prompt


def make_all_fix_prompt_alt(
    items_all_reasoning_and_outputs: list[tuple[str, list[tuple[str, RunOutput]]]],
    args: PromptArgs = PromptArgs(),
    use_next_prompt: bool = False,
    use_explicit_start: bool = False,
    use_output_diff: bool = True,
    use_if_fix_fail_line: bool = False,
    use_fix_reasoning_tags: bool = False,
    use_typical_issue_text: bool = False,
):
    prompt = list(
        get_alternative_system_prompt(
            use_diff_highlight=args.display_args.use_diff_highlight,
            use_diff_triangles=args.display_args.use_diff_triangles,
            additional_info=args.additional_info_in_system,
            just_reasoning_additional_info=args.just_reasoning_additional_info_in_system,
            just_attributes_additional_info=args.just_attributes_additional_info_in_system,
            use_many_ascii_representations=args.display_args.spreadsheet_ascii_full,
            use_alt_color_scheme=args.display_args.render_args.use_alt_color_scheme,
            disable_absolute_in_normalized_ascii=args.display_args.disable_absolute_in_normalized_ascii,
            long_as_you_want=args.emphasize_long_in_system,
            use_diff_rep=args.display_args.spreadsheet_ascii_show_diff_if_concise,
            use_resolve_ambiguity=args.system_use_resolve_ambiguity,
            use_multi_part_transformation_rule_hint=args.system_use_multi_part_transformation_rule_hint,
            use_explain_connected=args.system_use_explain_connected,
            connected_include_diagonals=args.display_args.connected_include_diagonals,
        )
    )

    # NOTE: we would need the alternative reasoning trace!!!
    # assert not args.display_args.render_args.use_alt_color_scheme
    # assert not args.display_args.spreadsheet_ascii_full

    if args.shuffle_example_order_with_permutation_index is not None:
        assert use_next_prompt

    for idx, (name, all_reasoning_and_outputs) in enumerate(
        items_all_reasoning_and_outputs
    ):
        is_last = idx == len(items_all_reasoning_and_outputs) - 1
        prompt.extend(
            make_fix_prompt_item(
                name=name,
                all_reasoning_and_outputs=tuple(
                    (
                        (reasoning_here, run_output.to_hashable())
                        for reasoning_here, run_output in all_reasoning_and_outputs
                    )
                ),
                display_args=args.display_args,
                use_next_prompt=use_next_prompt and is_last,
                use_explicit_start=use_explicit_start,
                use_output_diff=use_output_diff,
                use_if_fix_fail_line=use_if_fix_fail_line,
                shuffle_example_order_with_permutation_index=(
                    args.shuffle_example_order_with_permutation_index
                    if is_last
                    else None
                ),
                use_fix_reasoning_tags=use_fix_reasoning_tags,
                use_typical_issue_text=use_typical_issue_text,
            )
        )

    return prompt


def print_prompt(x: list[dict[str, Any]], show_images: bool = False):
    img_idx = 0
    for item in x:
        print(f"Role: {item['role']}")
        if isinstance(item["content"], str):
            print(item["content"])
            print()
            continue
        for sub_item in item["content"]:
            assert isinstance(sub_item, dict)
            if "text" in sub_item:
                print(sub_item["text"])
            else:
                assert "image_url" in sub_item
                if show_images:
                    img = sub_item["image_url"]["url"].split(",")[1]
                    img = base64.b64decode(img)
                    img_path = f"test_{img_idx}.png"
                    with open(img_path, "wb") as f:
                        f.write(img)
                    print(img_path)
                    img_idx += 1
                else:
                    print("<IMAGE/>")
        print()


def prompt_join_text_content(x: list[dict[str, Any]]):
    out = []
    for item in x:
        if isinstance(item["content"], str):
            out.append(item)
            continue

        assert isinstance(item["content"], list)

        running_text = ""
        for sub_item in item["content"]:
            assert "text" in sub_item
            running_text += sub_item["text"]

        out.append(
            {
                "role": item["role"],
                "content": running_text,
            }
        )

    return out


def is_eq_size_item(name: str):
    train = out_train_data_by_name_d[name]["train"]

    return all(np.array(x["input"]).shape == np.array(x["output"]).shape for x in train)


def convert_use_spreadsheet_if_eq_size(
    prompt_args: PromptArgs, is_eq_size_and_get_spreadsheet: bool
):
    assert prompt_args.force_reasoning_labeled_items is None
    if is_eq_size_and_get_spreadsheet:
        prompt_args_here = attrs.evolve(
            prompt_args,
            use_spreadsheet_if_eq_size_and_change_prompt_otherwise=False,
            force_reasoning_labeled_items=prompt_args.force_reasoning_labeled_items_spreadsheet_ascii,
        )
        assert prompt_args_here.display_args.spreadsheet_ascii
        assert prompt_args_here.display_args.spreadsheet_ascii_full
        return prompt_args_here
    else:
        return attrs.evolve(
            prompt_args,
            display_args=attrs.evolve(
                prompt_args.display_args,
                spreadsheet_ascii=False,
                spreadsheet_ascii_full=False,
                spreadsheet_ascii_show_diff_if_concise=False,
            ),
            use_spreadsheet_if_eq_size_and_change_prompt_otherwise=False,
            force_reasoning_labeled_items=tuple(
                prompt_args.force_reasoning_labeled_items_change_prompt
                if prompt_args.force_reasoning_labeled_items_change_prompt is not None
                else reasoning_labeled_change_prompt_alt_color_add_swap
            ),
        )


def process_prompt_args_for_name(name: str, prompt_args: PromptArgs):
    if not prompt_args.use_spreadsheet_if_eq_size_and_change_prompt_otherwise:
        return prompt_args

    return convert_use_spreadsheet_if_eq_size(
        prompt_args, is_eq_size_and_get_spreadsheet=is_eq_size_item(name)
    )


async def run_on_input_alt(
    name: str,
    t: float = 0.0,
    n: int = 1,
    prompt_args: PromptArgs = PromptArgs(),
    max_n_per_round: int = 48,
    max_n_map_if_greater: list[tuple[int, int]] = [
        (25_000, 32),
        (40_000, 16),
        (65_000, 8),
    ],
    fail_at_prompt_len: Optional[int] = None,
    fail_if_image_too_big_thresh: Optional[int] = None,
    dry_run: bool = False,
):
    if n == 0:
        if dry_run:
            print(f"Return because n=0, {prompt_args.name=} {is_eq_size_item(name)=}")
        return []

    prompt_args_here = process_prompt_args_for_name(name, prompt_args)

    this_prompt = list(make_prompt_alt(prompt_args_here))
    this_prompt.append(
        {
            "role": "user",
            "content": get_rule_input_alt(
                name,
                display_args=prompt_args_here.display_args,
                shuffle_example_order_with_permutation_index=prompt_args_here.shuffle_example_order_with_permutation_index,
                use_multi_part_transformation_rule_hint=prompt_args_here.use_multi_part_transformation_rule_hint_on_user_call,
            ),
        }
    )

    all_user_input_image_size = sum(
        np.array(z).size
        for x in out_train_data_by_name_d[name]["train"]
        for z in [x["input"], x["output"]]
    ) + sum(np.array(x["input"]).size for x in out_train_data_by_name_d[name]["test"])

    if (
        fail_if_image_too_big_thresh is not None
        and all_user_input_image_size > fail_if_image_too_big_thresh
    ):
        print(f"fail {all_user_input_image_size=}")
        return None

    file = io.StringIO()
    with contextlib.redirect_stdout(file) as f:
        print_prompt(this_prompt, show_images=False)

    n_toks = len(tokenizer.encode(file.getvalue()))  # ignores images for now

    if fail_at_prompt_len is not None and n_toks > fail_at_prompt_len:
        print(f"fail {n_toks=} {name=} {prompt_args.name=}")
        return None

    orig_max_n_per_round = max_n_per_round

    for thresh, new_max_n in max_n_map_if_greater:
        if n_toks > thresh:
            assert max_n_per_round > new_max_n
            max_n_per_round = new_max_n

    if orig_max_n_per_round != max_n_per_round:
        print(
            f"Reducing {orig_max_n_per_round=} to {max_n_per_round=} ({n_toks=}, {name=}, {prompt_args.name=})"
        )

    if dry_run:
        print(f"{name=} {prompt_args.name=} {n_toks=} {n=} {is_eq_size_item(name)=}")
        return []

    try:
        out = await call(this_prompt, t=t, n=n, max_n_per_call=max_n_per_round)
    except Exception as e:
        print(f"{name=} {e=} {e.args=}")

        if isinstance(e, RuntimeError) and "unsafe content" in str(e):
            return None

        raise
    out = normalize_ordering(out)

    print(f"{out[0].token_usage=}")

    return out


async def run_on_input_with_name_alt(
    name: str,
    t: float = 0.0,
    n: int = 1,
    prompt_args: PromptArgs = PromptArgs(),
    max_n_per_round: int = 48,
    max_n_map_if_greater: list[tuple[int, int]] = [
        (25_000, 32),
        (40_000, 16),
        (65_000, 8),
    ],
    fail_at_prompt_len: Optional[int] = None,
    fail_if_image_too_big_thresh: Optional[int] = None,
    dry_run: bool = False,
):
    out = await run_on_input_alt(
        name,
        t=t,
        n=n,
        prompt_args=prompt_args,
        max_n_per_round=max_n_per_round,
        max_n_map_if_greater=max_n_map_if_greater,
        fail_at_prompt_len=fail_at_prompt_len,
        fail_if_image_too_big_thresh=fail_if_image_too_big_thresh,
        dry_run=dry_run,
    )

    return name, prompt_args, t, None if out is None else [x.completion for x in out]


def gpt4_o_image_test_single(
    grid, render_args: RenderArgs = RenderArgs(use_alt_color_scheme=True)
):
    assert render_args.use_alt_color_scheme

    x, y = grid.shape
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"""Here is a {x} by {y} grid. The grid cells might be any of the following colors: "black", "blue", "red", "green", "yellow", "grey", "pink", "orange", "purple", and "brown".

Your task is to determine the color of each grid in the image and return the corresponding color. You should return a list of lists in json format (which is the same as Python format in this case) where each inner list corresponds to a row of the grid and each element of the inner list is the color of the corresponding cell in the grid (one of the strings from above).

Just return the list of lists with no commentary.""",
                },
                grid_to_base64_png_oai_content(grid, render_args=render_args),
            ],
        }
    ]


def gpt4_o_image_test_few_shot(
    grid, example_grids, render_args: RenderArgs = RenderArgs(use_alt_color_scheme=True)
):
    out_prompt = []

    for ex in example_grids:
        out_prompt.extend(gpt4_o_image_test_single(ex, render_args=render_args))
        out_prompt.append(
            {
                "role": "assistant",
                "content": "[\n"
                + "\n".join(
                    " " * 4
                    + "["
                    + ", ".join(f'"{alt_color_scheme_name[x]}"' for x in row)
                    + "],"
                    for row in ex
                )
                + "\n]",
            }
        )

    out_prompt.extend(gpt4_o_image_test_single(grid, render_args=render_args))

    return out_prompt


async def fix_on_input(
    name: str,
    all_reasoning_and_outputs: list[tuple[str, RunOutput]],
    example_all_reasoning_and_outputs: list[tuple[str, list[tuple[str, RunOutput]]]],
    t: float = 1.0,
    n: int = 16,
    args: PromptArgs = PromptArgs(),
    do_print_prompt: bool = False,
    use_explicit_start: bool = False,
    max_n_per_round: int = 32,
    max_n_map_if_greater: list[tuple[int, int]] = [
        (25_000, 32),
        (40_000, 16),
        (65_000, 8),
    ],
    use_output_diff: bool = True,  # not back compat, but better probably
    use_if_fix_fail_line: bool = False,
    use_fix_reasoning_tags: bool = False,
    use_typical_issue_text: bool = False,
):
    if n == 0:
        return name, all_reasoning_and_outputs, args, []

    this_prompt = list(
        make_all_fix_prompt_alt(
            example_all_reasoning_and_outputs + [(name, all_reasoning_and_outputs)],
            args=args,
            use_next_prompt=True,
            use_explicit_start=use_explicit_start,
            use_output_diff=use_output_diff,
            use_if_fix_fail_line=use_if_fix_fail_line,
            use_fix_reasoning_tags=use_fix_reasoning_tags,
            use_typical_issue_text=use_typical_issue_text,
        )
    )

    if do_print_prompt:
        print("=== PROMPT ===")
        print_prompt(this_prompt)

    file = io.StringIO()
    with contextlib.redirect_stdout(file) as f:
        print_prompt(this_prompt, show_images=False)

    prompt_text = file.getvalue()
    n_toks = len(tokenizer.encode(prompt_text))  # ignores images for now

    orig_max_n_per_round = max_n_per_round

    for thresh, new_max_n in max_n_map_if_greater:
        if n_toks > thresh:
            assert max_n_per_round > new_max_n
            max_n_per_round = new_max_n

    if orig_max_n_per_round != max_n_per_round:
        print(f"Reducing {orig_max_n_per_round=} to {max_n_per_round=} ({n_toks=})")

    try:
        out = await call(this_prompt, t=t, n=n, max_n_per_call=max_n_per_round)
    except Exception as e:
        print(f"{name=}")

        if isinstance(e, RuntimeError) and "unsafe content" in str(e):
            return name, all_reasoning_and_outputs, args, None
        if isinstance(e, RuntimeError) and name == "7c9b52a0.json":
            print("hack for now!")
            return name, all_reasoning_and_outputs, args, None
        if isinstance(e, ContextLengthExceeded):
            return name, all_reasoning_and_outputs, args, None

        raise

    out = normalize_ordering(out)

    print(f"{out[0].token_usage=}")

    return (
        name,
        all_reasoning_and_outputs,
        args,
        [x.completion for x in out],
    )


# Idea with this was to special case examples where grids are equal size, but substantially different colors (not is_smallish_edit(...))
# However, there are only ~5% of examples like this and they probably aren't handled that poorly by our existing functions IMO.
def is_smallish_edit(name: str, max_avg_diff: float = 0.4, max_any_diff: float = 0.6):
    train_data = out_train_data_by_name_d[name]["train"]

    all_average_differing = []
    for d in train_data:
        input_grid = np.array(d["input"])
        output_grid = np.array(d["output"])

        if input_grid.shape != output_grid.shape:
            return False

        this_average_differing = np.mean(input_grid != output_grid)

        if this_average_differing > max_any_diff:
            return False

        all_average_differing.append(this_average_differing)

    return np.mean(all_average_differing) < max_avg_diff
