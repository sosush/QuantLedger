import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

from env_loader import load_env

load_env()

# 1. Password Hashing Setup
# We use bcrypt. It mathematically scrambles a password so even if our database is hacked,
# the hackers can't read the passwords.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2. JWT Setup — values come from .env (see .env.example)
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-quant-key-do-not-share")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Creates the JWT Token containing the user's email."""
    to_encode = data.copy()
    
    # Set the expiration time
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Mathematically sign the token using our SECRET_KEY
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt