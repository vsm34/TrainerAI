import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    # pydantic-settings v2 config
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",  # <-- allow FIREBASE_CREDENTIALS_FILE and friends
    )

    PROJECT_NAME: str = "TrainerAI"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./trainerai.db"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


settings = Settings()
