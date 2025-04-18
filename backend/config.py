import os

from dotenv import load_dotenv
load_dotenv("../.env")

SECRET_KEY: str = os.environ.get("SECRET_KEY")
CASDOOR_ENDPOINT: str = os.environ.get("CASDOOR_ENDPOINT")
CASDOOR_CLIENT_ID: str = os.environ.get("CASDOOR_CLIENT_ID")
CASDOOR_CLIENT_SECRET: str = os.environ.get("CASDOOR_CLIENT_SECRET")
CASDOOR_REDIRECT_URI: str = os.environ.get("CASDOOR_REDIRECT_URI")
CASDOOR_TOKEN_ENDPOINT: str = os.environ.get("CASDOOR_TOKEN_ENDPOINT")
CASDOOR_APP_NAME: str = os.environ.get("CASDOOR_APP_NAME")
CASDOOR_ORGANIZATION_NAME: str = os.environ.get("CASDOOR_ORGANIZATION_NAME")
ALLOW_ORIGINS: list[str] = os.environ.get("ALLOW_ORIGINS", "*").split(",")