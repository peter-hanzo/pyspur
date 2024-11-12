from fastapi import APIRouter, HTTPException, Depends
from pathlib import Path
import json
from sqlalchemy.orm import Session

from ..models.workflow_model import WorkflowModel
from ..database import get_db
from datetime import datetime, timezone

router = APIRouter()

TEMPLATES_DIR = Path(__file__).parent.parent / 'templates'

@router.get("/templates/", description="List all available templates")
def list_templates():
    templates = []
    for template_file in TEMPLATES_DIR.glob("*.json"):
        with open(template_file, 'r') as f:
            template_content = json.load(f)
            metadata = template_content.get('metadata', {})
            templates.append({
                'name': metadata.get('name', template_file.stem),
                'description': metadata.get('description', ''),
                'features': metadata.get('features', []),
                'file_name': template_file.name
            })
    return templates

@router.post("/templates/{template_file_name}/instantiate/", description="Instantiate a new workflow from a template")
def instantiate_template(template_file_name: str, db: Session = Depends(get_db)):
    template_path = TEMPLATES_DIR / template_file_name
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    with open(template_path, 'r') as f:
        template_content = json.load(f)
    metadata = template_content.get('metadata', {})
    workflow_definition = template_content.get('workflow', {})
    # Create a new WorkflowModel instance
    new_workflow = WorkflowModel(
        name=metadata.get('name', 'Unnamed Template'),
        description=metadata.get('description', ''),
        definition=workflow_definition,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    return new_workflow
