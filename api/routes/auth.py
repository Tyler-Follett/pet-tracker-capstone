from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from services.auth_service import register_user, login_user

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(request: RegisterRequest):
    try:
        register_user(
            request.firstName,
            request.lastName,
            request.email,
            request.password
        )

        return {"message": "User registered successfully."}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(request: LoginRequest):
    try:
        user = login_user(request.email, request.password)
        return user

    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))