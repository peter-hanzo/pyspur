from ..models.task_model import TaskModel, TaskStatus
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional


class TaskRecorder:
    def __init__(self, db: Session, run_id: str):
        self.db = db
        self.run_id = run_id

    def create_task(self, node_id: str, inputs: Dict[str, Any]):
        task = TaskModel(run_id=self.run_id, node_id=node_id, inputs=inputs)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        self.task = task
        return

    def update_task(
        self,
        status: TaskStatus,
        inputs: Optional[Dict[str, Any]] = None,
        outputs: Optional[Dict[str, Any]] = None,
    ):
        self.task.status = status
        if inputs:
            self.task.inputs = inputs
        if outputs:
            self.task.outputs = outputs
        self.db.commit()
        return
