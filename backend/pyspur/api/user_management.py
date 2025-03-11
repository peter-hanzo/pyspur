from typing import cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user_session_model import UserModel
from ..schemas.user_schemas import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


@router.post("", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    session: Session = Depends(get_db),
) -> UserResponse:
    """Create a new user."""
    db_user = UserModel(
        external_id=user.external_id,
        metadata=user.user_metadata,
    )

    try:
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return UserResponse.model_validate(db_user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"User with external_id {user.external_id} already exists",
        ) from None


@router.get("", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_db),
) -> UserListResponse:
    """List users with pagination."""
    # Get total count
    total_count = cast(int, session.scalar(select(func.count()).select_from(UserModel)))

    # Get paginated users
    users = session.query(UserModel).order_by(UserModel.id).offset(skip).limit(limit).all()

    # Convert models to response schemas
    user_responses = [UserResponse.model_validate(user) for user in users]
    return UserListResponse(users=user_responses, total=total_count)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    session: Session = Depends(get_db),
) -> UserResponse:
    """Get a specific user by ID."""
    user = session.get(UserModel, int(user_id.lstrip("U")))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    session: Session = Depends(get_db),
) -> UserResponse:
    """Update a user."""
    db_user = session.get(UserModel, int(user_id.lstrip("U")))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)

    try:
        for field, value in update_data.items():
            setattr(db_user, field, value)

        session.commit()
        session.refresh(db_user)
        return UserResponse.model_validate(db_user)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"User with external_id {user_update.external_id} already exists",
        ) from None


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    session: Session = Depends(get_db),
) -> None:
    """Delete a user."""
    db_user = session.get(UserModel, int(user_id.lstrip("U")))
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(db_user)
    session.commit()
