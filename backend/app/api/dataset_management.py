from typing import List
from fastapi import Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..models.base_model import get_db
from ..models.dataset_model import DatasetModel
from ..models.run_model import RunModel
from ..schemas.dataset_schemas import DatasetResponseSchema
from ..schemas.run_schemas import RunResponseSchema

from fastapi import APIRouter

router = APIRouter()


def save_file(file: UploadFile) -> str:
    file_location = f"datasets/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    return file_location


@router.post(
    "/", response_model=DatasetResponseSchema, description="Upload a new dataset"
)
def upload_dataset(
    name: str,
    description: str = "",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DatasetResponseSchema:
    file_location = save_file(file)
    new_dataset = DatasetModel(
        name=name,
        description=description,
        file_path=file_location,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    return new_dataset


@router.get(
    "/", response_model=List[DatasetResponseSchema], description="List all datasets"
)
def list_datasets(db: Session = Depends(get_db)) -> List[DatasetResponseSchema]:
    datasets = db.query(DatasetModel).all()
    dataset_list = [
        DatasetResponseSchema(
            id=ds.id,
            name=ds.name,
            description=ds.description,
            filename=ds.file_path,
            created_at=ds.uploaded_at,
            updated_at=ds.uploaded_at,
        )
        for ds in datasets
    ]
    return dataset_list


@router.get(
    "/{dataset_id}/",
    response_model=DatasetResponseSchema,
    description="Get a dataset by ID",
)
def get_dataset(
    dataset_id: str, db: Session = Depends(get_db)
) -> DatasetResponseSchema:
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete(
    "/{dataset_id}/",
    description="Delete a dataset by ID",
)
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted"}


@router.get(
    "/{dataset_id}/list_runs/",
    description="List all runs that used this dataset",
    response_model=List[RunResponseSchema],
)
def list_dataset_runs(dataset_id: str, db: Session = Depends(get_db)):
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    runs = (
        db.query(RunModel)
        .filter(RunModel.input_dataset_id == dataset_id)
        .order_by(RunModel.created_at.desc())
        .all()
    )
    return runs
