import os
import json

# Load the JSON content
json_file_path = os.environ.get(
    "INPUT_JSON", "/Users/jean/tmp/arc-prize-2024/arc-agi_test_challenges.json"
)
with open(json_file_path, "r") as file:
    out_data_by_name_d = json.load(file)

loaded_names = list(out_data_by_name_d.keys())

train_json_file_path = os.environ.get(
    "INPUT_TRAIN_JSON",
    "/Users/jean/tmp/arc-prize-2024/arc-agi_training_challenges.json",
)

with open(train_json_file_path, "r") as file:
    out_train_data_by_name_d = json.load(file)

# backward compatibility hack
out_data_by_name_d.update(
    {name + ".json": v for name, v in out_train_data_by_name_d.items()}
)

eval_json_file_path = os.environ.get(
    "INPUT_EVAL_JSON",
    "/Users/jean/tmp/arc-prize-2024/arc-agi_evaluation_challenges.json",
)

with open(eval_json_file_path, "r") as file:
    out_eval_data_by_name_d = json.load(file)


def get_subset_to_run():
    names_alt = list(loaded_names)

    if "RUN_ON_SUBSET" in os.environ:
        subset = int(os.environ["RUN_ON_SUBSET"])
        names_alt = names_alt[:subset]

    print(f"{len(names_alt)=}")
    print("running", names_alt)

    return names_alt
