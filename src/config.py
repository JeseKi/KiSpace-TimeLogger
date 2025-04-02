import json

config = json.load(open("config.json"))

SECRET_KEY: str = config["secret_key"]
CASDOOR_ENDPOINT: str = config["casdoor_endpoint"]
CASDOOR_CLIENT_ID: str = config["casdoor_client_id"]
CASDOOR_CLIENT_SECRET: str = config["casdoor_client_secret"]
CASDOOR_REDIRECT_URI: str = config["casdoor_redirect_uri"]
CASDOOR_TOKEN_ENDPOINT: str = config["casdoor_token_endpoint"]
CASDOOR_APP_NAME: str = config["casdoor_app_name"]
CASDOOR_ORGANIZATION_NAME: str = config["casdoor_organization_name"]
ALLOW_ORIGINS: list[str] = config["allow_origins"]
