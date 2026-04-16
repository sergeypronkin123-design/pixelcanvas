from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.models.battle import Referral
from datetime import datetime, timezone
from typing import Optional
import re
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=128)
    ref: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must be alphanumeric")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    is_subscriber: bool
    subscription_until: datetime | None
    pixels_placed_total: int
    referral_code: str | None
    bonus_pixels: int
    clan_id: int | None
    clan_role: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")

    # Generate referral code
    ref_code = uuid.uuid4().hex[:8]

    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        referral_code=ref_code,
    )

    # Handle referral
    if data.ref:
        referrer = db.query(User).filter(User.referral_code == data.ref).first()
        if referrer:
            user.referred_by = referrer.id

    db.add(user)
    db.commit()
    db.refresh(user)

    # Give referrer bonus
    if user.referred_by:
        referrer = db.query(User).filter(User.id == user.referred_by).first()
        if referrer:
            referrer.bonus_pixels = (referrer.bonus_pixels or 0) + 5
            ref_record = Referral(referrer_id=referrer.id, referred_id=user.id)
            db.add(ref_record)
            db.commit()

            # Award PixelCoin to referrer
            try:
                from app.services import economy
                economy.add_coins(db, referrer.id, economy.COIN_REFERRAL_SIGNUP, "referral_signup",
                                  {"referred_user_id": user.id})
                db.commit()
                economy.check_achievements_for_user(db, referrer.id)
            except Exception:
                pass

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")

    # Ensure referral code exists
    if not user.referral_code:
        user.referral_code = uuid.uuid4().hex[:8]
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.is_subscriber and user.subscription_until:
        if user.subscription_until < datetime.now(timezone.utc):
            user.is_subscriber = False
    if not user.referral_code:
        user.referral_code = uuid.uuid4().hex[:8]
        db.commit()
        db.refresh(user)
    return UserOut.model_validate(user)
