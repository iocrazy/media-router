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


# Content types
ContentType = Literal["video", "image_text", "article"]
DistributionMode = Literal["broadcast", "one_to_one"]
Visibility = Literal["public", "private", "draft"]


# Per-account config override
class AccountConfig(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[list[str]] = None


# Task schemas
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType = "video"
    video_url: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: Visibility = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str]
    account_configs: dict[str, AccountConfig] = {}
    distribution_mode: DistributionMode = "broadcast"
    scheduled_at: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_content(self):
        has_video = self.video_url or self.video_urls
        if self.content_type == "video" and not has_video:
            raise ValueError("video_url or video_urls required for video content")
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
    cover_url: Optional[str] = None
    visibility: str = "public"
    ai_content: bool = False
    topics: list[str] = []
    distribution_mode: Optional[str] = None
    batch_id: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    share_id: Optional[str] = None
    created_at: datetime
    accounts: list[TaskAccountResponse]

    class Config:
        from_attributes = True


# Draft schemas
class DraftCreate(BaseModel):
    content_type: ContentType = "video"
    title: Optional[str] = None
    description: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: Visibility = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str] = []
    account_configs: dict[str, AccountConfig] = {}
    distribution_mode: DistributionMode = "broadcast"
    scheduled_at: Optional[datetime] = None


class DraftResponse(BaseModel):
    id: str
    content_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    video_urls: list[str] = []
    image_urls: list[str] = []
    article_content: Optional[str] = None
    cover_url: Optional[str] = None
    visibility: str = "public"
    ai_content: bool = False
    topics: list[str] = []
    account_ids: list[str] = []
    account_configs: dict = {}
    distribution_mode: str = "broadcast"
    scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Share schemas
class ShareSchemaResponse(BaseModel):
    schema_url: str
    share_id: str
