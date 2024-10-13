from typing import Any, Callable, Dict, List, Optional, Union


def combine_text(text1: str, text2: str, format_str: str = "{} {}") -> str:
    """Combine two texts using a specified format."""
    return format_str.format(text1, text2)


def combine_lists(*lists: List[Any]) -> List[Any]:
    """Combine multiple lists into one."""
    combined_list: List[Any] = []
    for lst in lists:
        combined_list.extend(lst)
    return combined_list


def create_list(*texts: Any) -> List[Any]:
    """Create a list from several input texts."""
    return list(texts)


def get_list_item(lst: List[Any], index: int) -> Any:
    """Get an item from a list by index."""
    try:
        return lst[index]
    except IndexError:
        raise IndexError("Index out of range.")


def flatten_list_of_lists(list_of_lists: List[List[Any]]) -> List[Any]:
    """Flatten a list of lists into a single list."""
    return [item for sublist in list_of_lists for item in sublist]


def text_formatter(format_str: str, *args, **kwargs) -> str:
    """Format text based on a specified formatter."""
    return format_str.format(*args, **kwargs)


def read_json_values(json_object: dict, keys):
    """Read values from a JSON object based on provided key(s)."""
    if isinstance(keys, (str, int)):
        return json_object.get(keys)
    elif isinstance(keys, list):
        return {key: json_object.get(key) for key in keys}
    else:
        raise TypeError("Keys must be a string, integer, or list of strings/integers.")


def find_and_replace(text: str, old: str, new: str) -> str:
    """Find and replace words in input text."""
    return text.replace(old, new)


def sort_csv(
    file_path: str,
    column_name: str,
    output_file: Optional[str] = None,
    ascending: bool = True,
):
    """Sort a CSV file based on a given column."""
    import csv

    with open(file_path, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        data = list(reader)
        data.sort(key=lambda x: x[column_name], reverse=not ascending)
        fieldnames = reader.fieldnames

        # Ensure fieldnames is not None
        if fieldnames is None:
            if data:
                fieldnames = list(data[0].keys())
            else:
                raise ValueError("No fieldnames found in CSV file.")

    if output_file:
        with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
    else:
        return data


def split_text(text: str, separator: str) -> list:
    """Split text into a list based on a specific character."""
    return text.split(separator)


def join_list_items(items: list, separator: str = "") -> str:
    """Join a list of items into a single text, separated by a character."""
    return separator.join(map(str, items))


def list_trimmer(
    lst: list,
    start: Optional[int] = None,
    end: Optional[int] = None,
    num_items: Optional[int] = None,
) -> list:
    """Trim a list to the specified range or number of items."""
    if num_items is not None:
        return lst[:num_items]
    return lst[start:end]


def filter_values(lst: list, condition_function) -> list:
    """Filter values by a specific condition."""
    return [item for item in lst if condition_function(item)]


def chunk_text(text: str, chunk_size: int) -> list:
    """Chunk text into specified number of characters."""
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


def row_similarity_search(text: str, query: str, nresults: int = 5) -> list:
    """Return lines most similar to the query."""
    from difflib import SequenceMatcher

    lines = text.splitlines()
    similarities = [
        (line, SequenceMatcher(None, query, line).ratio()) for line in lines
    ]
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [line for line, _ in similarities[:nresults]]


def duplicate(item, size: int, reference_list: Optional[list] = None) -> list:
    """Create a new list by duplicating a single item."""
    if reference_list is not None:
        size = len(reference_list)
    return [item for _ in range(size)]


def translate_text(text: str, src_lang: str, dest_lang: str) -> str:
    """Translate text from one language to another."""
    # Placeholder implementation; requires an external translation service
    raise NotImplementedError("Translation functionality requires an external service.")


def email_validator(email: str) -> bool:
    """Verify an email address format."""
    import re

    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return bool(re.match(pattern, email))
