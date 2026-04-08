from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re


# ---- Auth ----
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must be alphanumeric with underscores only")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(UserPublic):
    block_count: int = 0


# ---- Blocks ----
class BlockOut(BaseModel):
    id: int
    x: int
    y: int
    width: int
    height: int
    owner_id: Optional[int]
    owner_username: Optional[str] = None
    status: str
    base_price: int
    current_price: int
    created_at: datetime

    class Config:
        from_attributes = True


class BlockBulkOut(BaseModel):
    id: int
    x: int
    y: int
    status: str
    owner_id: Optional[int]
    current_price: int


class CanvasStateOut(BaseModel):
    blocks: List[BlockBulkOut]
    canvas_width: int
    canvas_height: int
    block_size: int


# ---- Pixels ----
class PixelUpdate(BaseModel):
    block_id: int
    pixels: List["PixelWrite"]


class PixelWrite(BaseModel):
    local_x: int = Field(ge=0, lt=10)
    local_y: int = Field(ge=0, lt=10)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class PixelOut(BaseModel):
    block_id: int
    local_x: int
    local_y: int
    color: str

    class Config:
        from_attributes = True


class BlockPixelsOut(BaseModel):
    block_id: int
    pixels: List[PixelOut]


# ---- Orders / Purchase ----
class PurchaseRequest(BaseModel):
    block_id: int


class PurchaseResaleRequest(BaseModel):
    listing_id: int


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    order_id: int


class OrderOut(BaseModel):
    id: int
    block_id: int
    amount: int
    currency: str
    status: str
    order_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Listings ----
class CreateListing(BaseModel):
    block_id: int
    price: int = Field(gt=0)


class ListingOut(BaseModel):
    id: int
    block_id: int
    block_x: int = 0
    block_y: int = 0
    seller_id: int
    seller_username: str = ""
    price: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Admin ----
class AdminStats(BaseModel):
    total_users: int
    total_blocks_owned: int
    total_orders: int
    total_revenue: int
    active_listings: int


TokenResponse.model_rebuild()
