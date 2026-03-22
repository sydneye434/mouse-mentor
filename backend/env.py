"""
Load .env before other backend modules read os.environ.
Developed by Sydney Edwards.
"""

from dotenv import load_dotenv

load_dotenv()
