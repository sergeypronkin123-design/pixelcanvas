from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas import UserRegister, UserLogin, TokenResponse, UserPublic, UserProfile
from app.models.block import Block, BlockStatus

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")

    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=UserProfile)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    block_count = db.query(Block).filter(
        Block.owner_id == user.id,
        Block.status.in_([BlockStatus.OWNED, BlockStatus.LISTED])
    ).count()
    profile = UserProfile.model_validate(user)
    profile.block_count = block_count
    return profile
