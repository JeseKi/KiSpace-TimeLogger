import asyncio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from loguru import logger

from jwt_utils import cleanup_expired_states, jwt_router, get_current_user, UserInfo
from config import SECRET_KEY
from schemas import Timelog
import database as db

origins = [
    "*"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TimeLogger启动中...")
    asyncio.create_task(cleanup_expired_states())
    logger.info("TimeLogger已启动")
    yield
    logger.info("TimeLogger关闭中...")
    
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

app.include_router(jwt_router, prefix="/api/auth")

@app.get("/api/timelogs")
async def get_timelogs(start_date: str, end_date: str, user: UserInfo = Depends(get_current_user)) -> list[dict]:
    """
    获取指定日期范围内的时间记录
    
    参数:
    - start_date: 开始日期，格式为YYYY-MM-DD
    - end_date: 结束日期，格式为YYYY-MM-DD
    - user: 当前用户信息
    
    返回:
    - 时间记录列表
    """
    try:
        timelogs = db.get_timelogs_by_date_range(start_date, end_date, user.id)
        return timelogs
    except Exception as e:
        logger.error(f"获取时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取时间记录失败: {str(e)}")

@app.post("/api/timelogs")
async def post_timelog(timelog: Timelog, user: UserInfo = Depends(get_current_user)) -> dict:
    """
    创建新的时间记录
    
    参数:
    - timelog: 时间记录数据
    - user: 当前用户信息
    
    返回:
    - 创建成功的消息和记录ID
    """
    try:
        timelog_id = db.create_timelog(
            user_id=user.id,
            timestamp=timelog.timestamp,
            activity=timelog.activity,
            tag=timelog.tag
        )
        return {"message": "时间记录创建成功", "id": timelog_id}
    except Exception as e:
        logger.error(f"创建时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建时间记录失败: {str(e)}")

@app.delete("/api/timelogs")
async def delete_timelog(id: str, user: UserInfo = Depends(get_current_user)) -> dict:
    """
    删除时间记录
    
    参数:
    - id: 要删除的时间记录ID
    - user: 当前用户信息
    
    返回:
    - 删除成功的消息
    """
    try:
        success = db.delete_timelog(id, user.id)
        if not success:
            raise HTTPException(status_code=404, detail="找不到指定的时间记录或无权限删除")
        return {"message": "时间记录删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除时间记录失败: {str(e)}")

@app.put("/api/timelogs")
async def update_timelog(id: str, timelog: Timelog, user: UserInfo = Depends(get_current_user)) -> dict:
    """
    更新时间记录
    
    参数:
    - id: 要更新的时间记录ID
    - timelog: 更新后的时间记录数据
    - user: 当前用户信息
    
    返回:
    - 更新成功的消息
    """
    try:
        success = db.update_timelog(
            uuid=id,
            user_id=user.id,
            timestamp=timelog.timestamp,
            activity=timelog.activity,
            tag=timelog.tag
        )
        if not success:
            raise HTTPException(status_code=404, detail="找不到指定的时间记录或无权限更新")
        return {"message": "时间记录更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新时间记录失败: {str(e)}")
