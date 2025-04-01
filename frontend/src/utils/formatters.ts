/**
 * 将秒数格式化为可读的时长字符串
 * 规则：
 * - < 48 小时: 显示为 Xh Ym 或 Ym (如果小时为0)
 * - >= 48 小时 且 < 168 小时 (7天): 显示为 Xd Yh (小时四舍五入)
 * - >= 168 小时 (7天): 显示为 Xd (天数四舍五入)
 * @param totalSeconds 总秒数
 * @returns 格式化后的时长字符串
 */
export const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds < 0) return '无效时长';
    if (totalSeconds === 0) return '0m'; // 0 秒显示为 0 分钟

    const totalMinutes = totalSeconds / 60;
    const totalHours = totalMinutes / 60;
    const totalDays = totalHours / 24;

    if (totalHours < 48) {
        // 少于 48 小时: Xh Ym
        const hours = Math.floor(totalHours);
        const minutes = Math.round(totalMinutes % 60); // 分钟四舍五入
        if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    } else if (totalHours < 168) {
        // 48 到 168 小时: Xd Yh (小时四舍五入)
        const days = Math.floor(totalDays);
        const hours = Math.round(totalHours % 24); // 小时四舍五入
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    } else {
        // 超过 168 小时: Xd (天数四舍五入)
        const days = Math.round(totalDays); // 天数四舍五入
        return `${days}d`;
    }
};

/**
 * 将秒数格式化为 小时:分钟 格式 (用于时间线 Tooltip)
 * @param totalSeconds 总秒数
 * @returns 格式化后的 H:MM 或 M:SS 字符串
 */
export const formatDurationSimple = (totalSeconds: number): string => {
    if (totalSeconds < 0) return '无效';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${remMinutes.toString().padStart(2, '0')}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    } else {
         return `${seconds}s`;
    }
};