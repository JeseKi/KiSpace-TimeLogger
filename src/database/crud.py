# database/crud.py
from datetime import datetime
from loguru import logger
import pytz
from typing import List, Dict, Any
from fastapi import HTTPException

from common import timeout

@timeout(10)
async def convert_to_utc(timestamp_str: str) -> str:
    """将本地时间或ISO 8601时间转换为UTC时间（保持不变）"""
    local_tz = pytz.timezone('Asia/Shanghai')
    
    if timestamp_str.endswith('Z'):
        try:
            clean_ts = timestamp_str.rstrip('Z') + '+00:00'
            utc_time = datetime.fromisoformat(clean_ts)
            return utc_time.isoformat()
        except ValueError:
            logger.error(f"无效的UTC时间戳格式: {timestamp_str}")
            return timestamp_str
    
    try:
        local_time = datetime.fromisoformat(timestamp_str)
    except ValueError:
        try:
            local_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            logger.error(f"无效的时间戳格式: {timestamp_str}")
            return timestamp_str
    
    if local_time.tzinfo is None:
        local_time = local_tz.localize(local_time)
    
    utc_time = local_time.astimezone(pytz.UTC)
    return utc_time.isoformat()

@timeout(10)
async def get_timelogs_by_date_range(start_date: str, end_date: str, user_id: str, db) -> List[Dict[str, Any]]:
    """根据日期范围获取时间记录"""
    async with db as conn:
        try:
            query = """
                SELECT uuid, user_id, timestamp, activity, tag 
                FROM time_logs 
                WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
            """
            result = conn.execute(query, (user_id, start_date, end_date)).fetchall()
            return [{
                "uuid": row[0],
                "user_id": row[1],
                "timestamp": row[2],
                "activity": row[3],
                "tag": row[4]
            } for row in result]
        except Exception as e:
            logger.error(f"获取时间记录失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取时间记录失败: {str(e)}")

@timeout(10)
async def create_timelog(user_id: str, timestamp: str, activity: str, tag: str, db) -> str:
    """创建新的时间记录"""
    import uuid
    async with db as conn:
        try:
            new_uuid = str(uuid.uuid4())
            utc_timestamp = await convert_to_utc(timestamp)
            query = """
                INSERT INTO time_logs (uuid, user_id, timestamp, activity, tag)
                VALUES (?, ?, ?, ?, ?)
            """
            conn.execute(query, (new_uuid, user_id, utc_timestamp, activity, tag))
            return new_uuid
        except Exception as e:
            logger.error(f"创建时间记录失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"创建时间记录失败: {str(e)}")

@timeout(10)
async def delete_timelog(uuid: str, user_id: str, db) -> bool:
    """删除时间记录"""
    async with db as conn:
        try:
            # 检查记录是否存在
            check_query = "SELECT 1 FROM time_logs WHERE uuid = ? AND user_id = ?"
            result = conn.execute(check_query, (uuid, user_id)).fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="时间记录不存在")
            
            query = "DELETE FROM time_logs WHERE uuid = ? AND user_id = ?"
            conn.execute(query, (uuid, user_id))
            return True
        except Exception as e:
            logger.error(f"删除时间记录失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"删除时间记录失败: {str(e)}")

@timeout(10)
async def update_timelog(uuid: str, user_id: str, timestamp: str, activity: str, tag: str, db) -> bool:
    """更新时间记录"""
    async with db as conn:
        try:
            # 检查记录是否存在
            check_query = "SELECT 1 FROM time_logs WHERE uuid = ? AND user_id = ?"
            result = conn.execute(check_query, (uuid, user_id)).fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="时间记录不存在")
            
            utc_timestamp = await convert_to_utc(timestamp)
            query = """
                UPDATE time_logs 
                SET timestamp = ?, activity = ?, tag = ?
                WHERE uuid = ? AND user_id = ?
            """
            conn.execute(query, (utc_timestamp, activity, tag, uuid, user_id))
            return True
        except Exception as e:
            logger.error(f"更新时间记录失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"更新时间记录失败: {str(e)}")