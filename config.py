from dotenv import load_dotenv
import os

load_dotenv()

# Optional — fill in as features need them.
MONGODB_URL = os.getenv("MONGODB_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
