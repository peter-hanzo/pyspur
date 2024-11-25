from fastapi import APIRouter, HTTPException
from pathlib import Path
import yaml
import asyncio
from typing import List, Dict, Any

from ..evals.evaluator import evaluate_model_on_dataset, load_yaml_config

router = APIRouter()

EVALS_DIR = Path(__file__).parent.parent / "evals" / "tasks"


@router.get("/", description="List all available evals")
def list_evals() -> List[Dict[str, Any]]:
    """
    List all available evals by scanning the tasks directory for YAML files.
    """
    evals = []
    if not EVALS_DIR.exists():
        raise HTTPException(status_code=500, detail="Evals directory not found")
    for eval_file in EVALS_DIR.glob("*.yaml"):
        try:
            eval_content = load_yaml_config(yaml_path=eval_file)
            metadata = eval_content.get("metadata", {})
            evals.append(
                {
                    "name": metadata.get("name", eval_file.stem),
                    "description": metadata.get("description", ""),
                    "type": metadata.get("type", "Unknown"),
                    "data_points": metadata.get("data_points", "N/A"),
                    "paper_link": metadata.get("paper_link", ""),
                    "file_name": eval_file.name,
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error parsing {eval_file.name}: {e}"
            )
    return evals


@router.post("/launch/", description="Launch an eval job")
async def launch_eval(eval_name: str, num_samples: int = 10) -> Dict[str, Any]:
    """
    Launch an eval job by triggering the evaluator with the specified eval configuration.
    """
    eval_file = EVALS_DIR / f"{eval_name}.yaml"
    if not eval_file.exists():
        raise HTTPException(status_code=404, detail="Eval configuration not found")

    try:
        # Load the eval configuration
        task_config = load_yaml_config(eval_file)
        # Run the evaluation
        results = await evaluate_model_on_dataset(task_config, num_samples=num_samples)
        return {
            "status": "success",
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error launching eval: {e}")
