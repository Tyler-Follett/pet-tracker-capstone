from sqlalchemy import text
from database import engine
from utils.security import hash_password, verify_password


def get_user_by_email(email: str):
    query = text("""
        SELECT UserId, FirstName, LastName, Email, PasswordHash
        FROM Users
        WHERE Email = :email
    """)

    with engine.connect() as connection:
        result = connection.execute(query, {"email": email}).mappings().first()
        return result


def register_user(first_name: str, last_name: str, email: str, password: str):
    existing_user = get_user_by_email(email)

    if existing_user:
        raise ValueError("A user with this email already exists.")

    password_hash = hash_password(password)

    query = text("""
        INSERT INTO Users (FirstName, LastName, Email, PasswordHash)
        VALUES (:first_name, :last_name, :email, :password_hash)
    """)

    with engine.begin() as connection:
        connection.execute(query, {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password_hash": password_hash
        })


def login_user(email: str, password: str):
    user = get_user_by_email(email)

    if not user:
        raise ValueError("Invalid email or password.")

    if not user["PasswordHash"]:
        raise ValueError("This account does not have a password set.")

    if not verify_password(password, user["PasswordHash"]):
        raise ValueError("Invalid email or password.")

    return {
        "userId": user["UserId"],
        "firstName": user["FirstName"],
        "lastName": user["LastName"],
        "email": user["Email"]
    }