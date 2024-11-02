import csv
from typing import Any, Dict, Iterator


def get_ds_iterator(
    file_path: str,
) -> Iterator[Dict[str, Any]]:
    # temporary implementation, will be replaced with a complete implementation
    with open(file_path, "r") as file:
        reader = csv.DictReader(file)
        for row in reader:
            yield row
