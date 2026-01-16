from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str  # Service role key for admin operations

    # Douyin OAuth
    DOUYIN_CLIENT_KEY: str
    DOUYIN_CLIENT_SECRET: str
    DOUYIN_REDIRECT_URI: str

    # App
    FRONTEND_URL: str = "http://localhost:5173"
    SECRET_KEY: str = "change-me-in-production"

    class Config:
        env_file = ".env"


settings = Settings()
