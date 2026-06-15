from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def get_users():
    with engine.connect() as connection:
        result = connection.execute(text("""
            SELECT UserId, FirstName, LastName, Email, CreatedAt
            FROM Users
        """))

        return [dict(row._mapping) for row in result]