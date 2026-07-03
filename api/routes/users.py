from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None


@router.get("")
def get_users():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT UserId, FirstName, LastName, Email, CreatedAt
            FROM Users
        """))
        return [dict(row._mapping) for row in result]


@router.post("")
def create_user(user: UserCreate):
    with engine.begin() as connection:
        result = connection.execute(text("""
            INSERT INTO Users (FirstName, LastName, Email)
            OUTPUT INSERTED.UserId
            VALUES (:firstName, :lastName, :email)
        """), user.model_dump())

        return {"userId": result.scalar(), "message": "User created"}