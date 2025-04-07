import asyncio
import os

from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.concurrency import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from duckdb import DuckDBPyConnection
from loguru import logger

from jwt_utils import cleanup_expired_states, jwt_router, get_current_user, UserInfo
from config import SECRET_KEY, ALLOW_ORIGINS
from schemas import TimelogRequest
from database.base import init_db, get_db
from database.crud import get_timelogs_by_date_range, create_timelog, delete_timelog, update_timelog, export_to_csv

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TimeLogger启动中...")
    asyncio.create_task(cleanup_expired_states())
    await init_db()
    logger.info("TimeLogger已启动")
    yield
    logger.info("TimeLogger关闭中...")
    
app = FastAPI(
    title="TimeLogger",
    description="TimeLogger是一款时间监控应用，我自己的习惯是以时间戳+描述+标签的方式来记录自己的时间。因此这款应用的重点就在于对时间的记录和监控。",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.environ.get("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.environ.get("ENVIRONMENT") != "production" else None,
    openapi_url="/openapi.json" if os.environ.get("ENVIRONMENT") != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

timelog_router = APIRouter()

@timelog_router.get("", response_model=list[dict])
async def timelog_get(start_date: str, end_date: str, user: UserInfo = Depends(get_current_user), db: DuckDBPyConnection = Depends(get_db)) -> list[dict]:
    """
    获取指定日期范围内的时间记录
    
    参数:
    - start_date: 开始时间，格式为YYYY-MM-DD HH:MM:SS
    - end_date: 结束时间，格式为YYYY-MM-DD HH:MM:SS
    - user: 当前用户信息
    
    返回:
    - 时间记录列表
    """
    try:
        timelogs = await get_timelogs_by_date_range(start_date, end_date, user.id, db)
        return timelogs
    except Exception as e:
        logger.error(f"获取时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取时间记录失败: {str(e)}")

@timelog_router.post("", response_model=dict)
async def timelog_create(timelog: TimelogRequest, user: UserInfo = Depends(get_current_user), db: DuckDBPyConnection = Depends(get_db)) -> dict:
    """
    创建新的时间记录
    
    参数:
    - timelog: 时间记录数据
    - user: 当前用户信息
    
    返回:
    - 创建成功的消息和记录ID
    """
    try:
        timelog_id = await create_timelog(
            user_id=user.id,
            timestamp=timelog.timestamp,
            activity=timelog.activity,
            tag=timelog.tag,
            db=db
        )
        return {"message": "时间记录创建成功", "id": timelog_id}
    except Exception as e:
        logger.error(f"创建时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建时间记录失败: {str(e)}")

@timelog_router.delete("", response_model=dict)
async def timelog_delete(uuid: str, user: UserInfo = Depends(get_current_user), db: DuckDBPyConnection = Depends(get_db)) -> dict:
    """
    删除时间记录
    
    参数:
    - uuid: 要删除的时间记录ID
    - user: 当前用户信息
    
    返回:
    - 删除成功的消息
    """
    try:
        success = await delete_timelog(uuid, user.id, db)
        if not success:
            raise HTTPException(status_code=404, detail="找不到指定的时间记录或无权限删除")
        return {"message": "时间记录删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除时间记录失败: {str(e)}")

@timelog_router.put("", response_model=dict)
async def timelog_update(uuid: str, timelog: TimelogRequest, user: UserInfo = Depends(get_current_user), db: DuckDBPyConnection = Depends(get_db)) -> dict:
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
        success = await update_timelog(
            uuid=uuid,
            user_id=user.id,
            timestamp=timelog.timestamp,
            activity=timelog.activity,
            tag=timelog.tag,
            db=db
        )
        if not success:
            raise HTTPException(status_code=404, detail="找不到指定的时间记录或无权限更新")
        return {"message": "时间记录更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新时间记录失败: {str(e)}")
    
@timelog_router.get("/export")
async def timelog_export(user: UserInfo = Depends(get_current_user), db: DuckDBPyConnection = Depends(get_db)):
    try:
        file_path = "/tmp/timelogs.csv"
        await export_to_csv(user.id, file_path, db)
        return FileResponse(file_path, filename="timelogs.csv")
    except Exception as e:
        logger.error(f"导出时间记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导出时间记录失败: {str(e)}")


app.include_router(jwt_router, prefix="/api/auth", tags=["auth"])
app.include_router(timelog_router, prefix="/api/timelogs", tags=["timelogs"])

@app.get("/{path}")
async def catch_all(path: str):
    logger.info(f"Requested path: {path}")
    return FileResponse("dist/index.html")

app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")