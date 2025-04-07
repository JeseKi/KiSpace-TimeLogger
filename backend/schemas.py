from pydantic import BaseModel

class CallbackRequest(BaseModel):
    code: str
    state: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    id_token: str
    scope: str
    token_type: str
    expires_in: int

class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    email_verified_at: str
    created_at: str
    updated_at: str

class TimelogRequest(BaseModel):
    timestamp: str
    activity: str
    tag: str
    