from sqlalchemy import Computed, Integer, ForeignKey, Enum, JSON, DateTime, String
from sqlalchemy.orm import relationship, Mapped, mapped_column
from enum import Enum as PyEnum
from datetime import datetime
from typing import Dict, Optional, List, Any
from .base import BaseModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .workflow import WorkflowModel
    from .task import TaskModel
    from .dataset import DatasetModel
    from .output_file import OutputFileModel


class RunStatus(PyEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RunModel(BaseModel):
    __tablename__ = "runs"

    _intid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement="auto")
    id: Mapped[str] = mapped_column(
        String, Computed("'R' || _intid"), nullable=False, index=True
    )
    workflow_id: Mapped[str] = mapped_column(
        String, ForeignKey("workflows.id"), nullable=False, index=True
    )
    parent_run_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("runs.id"), nullable=True, index=True
    )
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus), default=RunStatus.PENDING, nullable=False
    )
    run_type: Mapped[str] = mapped_column(String, nullable=False)
    initial_inputs: Mapped[Optional[Dict[str, Dict[str, Any]]]] = mapped_column(JSON)
    input_dataset_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("datasets.id"), nullable=True, index=True
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    outputs: Mapped[Optional[Any]] = mapped_column(JSON)
    output_file_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("output_files.id"), nullable=True, index=True
    )

    workflow: Mapped["WorkflowModel"] = relationship("Workflow", back_populates="runs")
    tasks: Mapped[List["TaskModel"]] = relationship("Task", back_populates="run")
    parent_run: Mapped[Optional["RunModel"]] = relationship(
        "Run", remote_side=[id], backref="subruns"
    )
    subruns: Mapped[List["RunModel"]] = relationship("Run", backref="parent_run")
    input_dataset: Mapped["DatasetModel"] = relationship(
        "Dataset", back_populates="runs"
    )
    output_file: Mapped["OutputFileModel"] = relationship(
        "OutputFile", back_populates="run"
    )

    @property
    def percentage_complete(self) -> Optional[float]:
        if self.status == RunStatus.PENDING:
            return 0.0
        elif self.status == RunStatus.COMPLETED:
            return 1.0
        elif self.status == RunStatus.FAILED:
            return 0.0
        elif self.initial_inputs:
            return 0.5
        elif self.input_dataset_id:
            # return percentage of subruns completed
            return (
                1.0
                * len(
                    [
                        subrun
                        for subrun in self.subruns
                        if subrun.status == RunStatus.COMPLETED
                    ]
                )
                / (1.0 * len(self.subruns))
            )
