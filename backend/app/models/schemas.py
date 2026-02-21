from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Literal, Optional


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
ContentType = Literal["video", "image_text", "article"]


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType = "video"
    video_url: Optional[str] = None
    image_urls: list[str] = []
    article_content: Optional[str] = None
    account_ids: list[str]
    scheduled_at: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_content(self):
        if self.content_type == "video" and not self.video_url:
            raise ValueError("video_url is required for video content")
        if self.content_type == "image_text" and not self.image_urls:
            raise ValueError("image_urls is required for image_text content")
        if self.content_type == "article" and not self.article_content:
            raise ValueError("article_content is required for article content")
        return self


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
    content_type: ContentType = "video"
    video_url: Optional[str] = None
    image_urls: list[str] = []
    article_content: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    share_id: Optional[str] = None
    created_at: datetime
    accounts: list[TaskAccountResponse]

    class Config:
        from_attributes = True


# Share schemas
class ShareSchemaResponse(BaseModel):
    schema_url: str
    share_id: str
