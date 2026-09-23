import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    BASE_DIR = Path(__file__).resolve().parent

    MODEL_PATH = os.getenv(
        "MODEL_PATH",
        str(BASE_DIR / "ml" / "nids_model.onnx")
    )

    SCALER_PATH = os.getenv(
        "SCALER_PATH",
        str(BASE_DIR / "ml" / "scaler.pkl")
    )

    CAPTURE_IDLE_TIMEOUT = int(
        os.getenv("CAPTURE_IDLE_TIMEOUT", "5")
    )

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173"
    )
