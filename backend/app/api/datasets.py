from fastapi import Depends, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..models.base import get_db
from ..models.dataset import DatasetModel
from ..schemas.dataset import DatasetResponseSchema, DatasetListResponseSchema

from fastapi import APIRouter

router = APIRouter()


def save_file(file: UploadFile) -> str:
    file_location = f"datasets/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    return file_location


@router.post("/datasets/", response_model=DatasetResponseSchema)
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
    return DatasetResponseSchema(
        id=new_dataset.id,
        name=new_dataset.name,
        description=new_dataset.description,
        filename=new_dataset.file_path,
        created_at=new_dataset.uploaded_at,
        updated_at=new_dataset.uploaded_at,
    )


@router.get("/datasets/", response_model=DatasetListResponseSchema)
def list_datasets(db: Session = Depends(get_db)) -> DatasetListResponseSchema:
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
    return DatasetListResponseSchema(datasets=dataset_list)
