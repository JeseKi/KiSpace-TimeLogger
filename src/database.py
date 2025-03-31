import sqlite3
import uuid
from datetime import datetime
from loguru import logger
import pytz
from typing import List, Dict, Any, Optional

# 数据库文件路径
DB_FILE = './timestamp.db'

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        logger.error(f"获取数据库连接失败: {str(e)}")
        raise

def convert_to_utc(timestamp_str: str) -> str:
    """将本地时间转换为UTC时间"""
    # 假设输入的时间戳是中国时区（UTC+8）
    local_tz = pytz.timezone('Asia/Shanghai')
    
    # 解析时间字符串
    try:
        # 尝试解析完整的日期时间格式
        local_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        # 如果解析失败，返回原始字符串
        return timestamp_str
    
    # 为本地时间添加时区信息
    local_time = local_tz.localize(local_time)
    
    # 转换为UTC时间
    utc_time = local_time.astimezone(pytz.UTC)
    
    # 返回ISO格式的UTC时间字符串
    return utc_time.isoformat()

def get_timelogs_by_date_range(start_date: str, end_date: str, user_id: str) -> List[Dict[str, Any]]:
    """根据日期范围获取时间记录"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 将日期转换为UTC时间格式进行查询
        start_utc = convert_to_utc(f"{start_date} 00:00:00")
        end_utc = convert_to_utc(f"{end_date} 23:59:59")
        
        # 查询指定日期范围内的时间记录
        cursor.execute(
            'SELECT * FROM time_logs WHERE user_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp',
            (user_id, start_utc, end_utc)
        )
        
        # 获取结果
        rows = cursor.fetchall()
        
        # 将结果转换为字典列表
        result = []
        for row in rows:
            result.append({
                'id': row['uuid'],
                'timestamp': row['timestamp'],
                'activity': row['activity'],
                'tag': row['tag'],
                'user_id': row['user_id']
            })
        
        return result
    finally:
        conn.close()

def create_timelog(user_id: str, timestamp: str, activity: str, tag: str) -> str:
    """创建新的时间记录"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 生成UUID
        record_uuid = str(uuid.uuid4())
        
        # 将时间戳转换为UTC格式
        utc_timestamp = convert_to_utc(timestamp)
        
        # 插入数据
        cursor.execute(
            'INSERT INTO time_logs (uuid, user_id, timestamp, activity, tag) VALUES (?, ?, ?, ?, ?)',
            (record_uuid, user_id, utc_timestamp, activity, tag)
        )
        
        # 提交事务
        conn.commit()
        
        return record_uuid
    finally:
        conn.close()

def delete_timelog(uuid: str, user_id: str) -> bool:
    """删除时间记录"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 首先检查记录是否存在且属于该用户
        cursor.execute('SELECT * FROM time_logs WHERE uuid = ? AND user_id = ?', (uuid, user_id))
        if not cursor.fetchone():
            return False
        
        # 删除记录
        cursor.execute('DELETE FROM time_logs WHERE uuid = ? AND user_id = ?', (uuid, user_id))
        
        # 提交事务
        conn.commit()
        
        return cursor.rowcount > 0
    finally:
        conn.close()

def update_timelog(uuid: str, user_id: str, timestamp: str, activity: str, tag: str) -> bool:
    """更新时间记录"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 首先检查记录是否存在且属于该用户
        cursor.execute('SELECT * FROM time_logs WHERE uuid = ? AND user_id = ?', (uuid, user_id))
        if not cursor.fetchone():
            return False
        
        # 将时间戳转换为UTC格式
        utc_timestamp = convert_to_utc(timestamp)
        
        # 更新记录
        cursor.execute(
            'UPDATE time_logs SET timestamp = ?, activity = ?, tag = ? WHERE uuid = ? AND user_id = ?',
            (utc_timestamp, activity, tag, uuid, user_id)
        )
        
        # 提交事务
        conn.commit()
        
        return cursor.rowcount > 0
    finally:
        conn.close()

def get_timelog_by_id(uuid: str, user_id: str) -> Optional[Dict[str, Any]]:
    """根据ID获取时间记录"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 查询指定ID的时间记录
        cursor.execute('SELECT * FROM time_logs WHERE uuid = ? AND user_id = ?', (uuid, user_id))
        
        # 获取结果
        row = cursor.fetchone()
        
        if not row:
            return None
        
        # 将结果转换为字典
        return {
            'id': row['uuid'],
            'timestamp': row['timestamp'],
            'activity': row['activity'],
            'tag': row['tag'],
            'user_id': row['user_id']
        }
    finally:
        conn.close()
