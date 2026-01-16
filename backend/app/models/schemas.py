from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Account schemas
class AccountBase(BaseModel):
    platform: str
    platform_user_id: str
    username: str
    avatar_url: Optional[str] = None


class AccountResponse(AccountBase):
    id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Task schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    account_ids: list[str]


class TaskAccountResponse(BaseModel):
    account_id: str
    username: str
    avatar_url: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    published_url: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    video_url: str
    status: str
    created_at: datetime
    accounts: list[TaskAccountResponse]

    class Config:
        from_attributes = True
