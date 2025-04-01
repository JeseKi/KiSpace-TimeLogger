// src/pages/TimeLogPage/TimeLogPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DatePicker, Button, message, Typography, Modal, Spin } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getTimelogs, Timelog, deleteTimelog } from '../../Api';
import TimeLogTable from '../../components/TimeLogTable';
import AddTimelogModal from '../../components/AddTimelogModal';
import EditTimelogModal from '../../components/EditTimelogModal';
import TagPieChart from '../../components/TagPieChart';
import TagBarChart from '../../components/TagBarChart';
import TimelineChart from '../../components/TimelineChart';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const TimeLogPage: React.FC = () => {
  // 数据状态管理
  const [timelogs, setTimelogs] = useState<Timelog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pieChartData, setPieChartData] = useState<{ label: string; value: number }[]>([]);
  
  // 日期范围
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  
  // 模态框状态管理
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
  // 记录操作状态
  const [recordToEdit, setRecordToEdit] = useState<Timelog | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // 时间线图状态
  const [timelineDate, setTimelineDate] = useState<Dayjs>(dayjs()); 
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineRawData, setTimelineRawData] = useState<Timelog[]>([]);

  const fetchTimelogs = useCallback(async (showSuccessMessage = true) => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) {
        message.warning('请选择有效的开始和结束日期喵！');
        return;
      }
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        message.error('未找到认证信息，请先登录喵！');
        setError('用户未认证');
        return;
      }
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      setLoading(true);
      setError(null);

      try {
        const data = await getTimelogs(startDate, endDate, accessToken);
        setTimelogs(data);
        if (showSuccessMessage) {
            message.success(`成功获取 ${startDate} 到 ${endDate} 的时间记录喵！`, 2);
        }
      } catch (err: any) {
        console.error('获取时间记录失败:', err);
        const errorMsg = err.response?.data?.detail || err.message || '获取数据时发生未知错误喵 T_T';
        setError(errorMsg);
        message.error(`获取时间记录失败: ${errorMsg}`);
      } finally {
        setLoading(false);
      }

  }, [dateRange]);

  useEffect(() => {
    fetchTimelogs();
  }, [fetchTimelogs]);

  useEffect(() => {
    if (timelogs && timelogs.length > 1) {
        console.log("开始处理数据用于饼图喵...", timelogs);

        const sortedTimelogs = [...timelogs].sort((a, b) =>
            dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
        );
        console.log("排序后的数据:", sortedTimelogs);

        const durationByTag: { [key: string]: number } = {};

        for (let i = 1; i < sortedTimelogs.length; i++) {
            const currentRecord = sortedTimelogs[i];
            const previousRecord = sortedTimelogs[i - 1];

            const durationInSeconds = dayjs(currentRecord.timestamp).diff(dayjs(previousRecord.timestamp), 'second');

            const tag = currentRecord.tag || '未分类';

            durationByTag[tag] = (durationByTag[tag] || 0) + durationInSeconds;

            console.log(`记录 ${i}: ${currentRecord.tag} (${currentRecord.activity}) 认领时长: ${durationInSeconds}秒 (来自记录 ${i-1} 到 ${i})`);
        }
        console.log("按标签聚合的总时长(秒):", durationByTag);

        const formattedPieData = Object.entries(durationByTag)
            .map(([tag, duration]) => ({
                label: tag,
                value: duration,
            }))
            .filter(item => item.value > 0);

        console.log("格式化后的饼图数据:", formattedPieData);
        setPieChartData(formattedPieData);

    } else {
        setPieChartData([]);
        console.log("时间记录不足两条，无法计算时长，清空饼图数据喵。");
    }
  }, [timelogs]);

  const fetchTimelineData = useCallback(async () => {
    if (!timelineDate) {
        message.warning('请选择时间线要显示的日期喵！');
        return;
    }
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        setTimelineError('用户未认证');
        return;
    }

    // 1. 定义获取数据的时间范围（前后各一天，共三天）
    const fetchStartDate = timelineDate.subtract(1, 'day').startOf('day');
    const fetchEndDate = timelineDate.add(2, 'day').startOf('day'); // 获取到次日之后一天的0点，确保包含完整的次日记录

    // 2. 定义目标日期的时间范围
    const targetDayStart = timelineDate.startOf('day');
    const targetDayEnd = timelineDate.add(1, 'day').startOf('day');

    setTimelineLoading(true);
    setTimelineError(null);
    console.log(`开始获取时间线数据，抓取范围: ${fetchStartDate.format('YYYY-MM-DD HH:mm:ss')} 到 ${fetchEndDate.format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`目标日期范围: ${targetDayStart.format('YYYY-MM-DD HH:mm:ss')} 到 ${targetDayEnd.format('YYYY-MM-DD HH:mm:ss')}`);

    try {
        // 3. 获取三天的数据
        const allData = await getTimelogs(
            fetchStartDate.format('YYYY-MM-DDTHH:mm:ss'),
            fetchEndDate.format('YYYY-MM-DDTHH:mm:ss'),
            accessToken
        );

        // 4. 按时间戳升序排序
        const sortedData = allData.sort((a, b) =>
            dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
        );
        console.log("获取并排序后的三天原始数据:", sortedData);

        // 5. 处理数据，生成目标日期的时间线片段
        const timelineSegments: any[] = []; // 使用 any[] 临时存储，或定义更精确的类型
        
        // 5.1 添加当天的开始点（作为起始标记）
        timelineSegments.push({
            uuid: 'day-start', // 特殊的UUID
            timestamp: targetDayStart.toISOString(),
            endTime: targetDayStart.toISOString(),
            duration: 0,
            activity: '今日起始点',
            tag: '起始点',
        });

        // 5.2 处理每个活动时间段
        for (let i = 0; i < sortedData.length; i++) {
          const curr = sortedData[i];
          const next = sortedData[i + 1]; // 获取下一条记录
      
          const segmentStart = dayjs(curr.timestamp);
          // 如果有下一条记录，则当前段的结束时间是下一条记录的开始时间
          // 如果没有下一条记录（即当前是最后一条），我们将结束时间暂定为目标日期的结束，后续会裁剪
          const segmentEnd = next ? dayjs(next.timestamp) : targetDayEnd;
      
          const activity = curr.activity;
          const tag = curr.tag;
          const uuid = curr.uuid; // 保留uuid
      
          // 计算当前时间段与目标日期的重叠部分
          const overlapStart = dayjs(Math.max(segmentStart.valueOf(), targetDayStart.valueOf())); // 取两者中较晚的时间
          const overlapEnd = dayjs(Math.min(segmentEnd.valueOf(), targetDayEnd.valueOf()));     // 取两者中较早的时间
      
          // 确保重叠部分有效（开始时间早于结束时间）
          if (overlapStart && overlapEnd && overlapStart.isBefore(overlapEnd)) {
              timelineSegments.push({
                  uuid: uuid, // 添加uuid
                  timestamp: overlapStart.toISOString(), // 使用重叠开始时间
                  endTime: overlapEnd.toISOString(),   // 使用重叠结束时间
                  duration: overlapEnd.diff(overlapStart, 'second'), // 计算重叠时长
                  activity: activity,
                  tag: tag,
              });
          }
        }

        // 5.3 检查最后一个时间段是否与目标日期结束相同，如果是，则需要使用次日的第一个活动信息
        if (timelineSegments.length > 1) {
            const lastSegment = timelineSegments[timelineSegments.length - 1];
            // 如果最后一个片段的结束时间是目标日期的结束时间(也就是次日0点)
            if (dayjs(lastSegment.endTime).isSame(targetDayEnd)) {
                // 查找次日数据中第一条记录（即目标日之后的第一条）
                const nextDayFirstRecord = sortedData.find(record => 
                    dayjs(record.timestamp).isAfter(targetDayEnd)
                );
                
                if (nextDayFirstRecord) {
                    // 修改最后一个片段，使用次日第一条活动的信息
                    // 但保持原片段的开始时间，结束时间改为当天的23:59:59
                    const endTime = targetDayEnd.subtract(1, 'second');
                    lastSegment.activity = nextDayFirstRecord.activity;
                    lastSegment.tag = nextDayFirstRecord.tag;
                    lastSegment.endTime = endTime.toISOString();
                    lastSegment.duration = dayjs(endTime).diff(dayjs(lastSegment.timestamp), 'second');
                    
                    console.log("已修正最后一个时间段，使用次日第一条活动信息:", lastSegment);
                }
            }
        }

        console.log("处理后的目标日期时间线数据:", timelineSegments);
        setTimelineRawData(timelineSegments); // 更新状态

    } catch (err: any) {
        console.error('获取或处理时间线数据失败:', err);
        const errorMsg = err.response?.data?.detail || err.message || '获取时间线数据时发生错误喵 T_T';
        setTimelineError(errorMsg);
        message.error(`获取时间线数据失败: ${errorMsg}`);
        setTimelineRawData([]); // 出错时清空数据
    } finally {
        setTimelineLoading(false);
    }
}, [timelineDate]); // 依赖时间线选择的日期

  // --- Effect Hook: 当 timelineDate 变化时，获取时间线数据 ---
  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]); // 依赖 fetchTimelineData (它内部依赖 timelineDate)

  const handleEdit = (record: Timelog) => {
    console.log('准备编辑记录:', record);
    setRecordToEdit(record);
    setIsEditModalVisible(true);
  };

  const handleDelete = (id: string) => {
    console.log(`准备打开确认模态框，目标 ID: ${id}`);
    setRecordToDelete(id);
  };

  const handleAddSuccess = async () => {
      setIsAddModalVisible(false);
      fetchTimelogs(false);
      message.success("新记录添加成功啦喵！🎉");
      await fetchTimelineData();
  };

  const handleEditSuccess = async () => {
      setIsEditModalVisible(false);
      setRecordToEdit(null);
      fetchTimelogs(false);
      message.success("记录更新成功啦喵！🎉");
      await fetchTimelineData();
  };

  const handleEditCancel = () => {
      setIsEditModalVisible(false);
      setRecordToEdit(null);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    console.log(`确认删除 ID: ${recordToDelete}`);
    setDeleting(true);
    const hideLoadingMsg = message.loading('正在删除记录喵...', 0);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
          message.error('未找到认证信息，请先登录喵！');
          setDeleting(false);
          hideLoadingMsg();
          setIsEditModalVisible(false);
          return;
      }

      await deleteTimelog(recordToDelete, accessToken);
      message.success('记录删除成功啦！喵~');
      await fetchTimelogs(false);
      setIsEditModalVisible(false);
      setRecordToDelete(null);

    } catch (error: any) {
      console.error(`删除记录 (ID: ${recordToDelete}) 失败:`, error);
      const errorMsg = error.response?.data?.detail || error.message || '删除记录时发生错误喵 T_T';
      message.error(`删除失败: ${errorMsg}`);
    } finally {
      setDeleting(false);
      hideLoadingMsg();
      await fetchTimelineData();
    }
  };

  const handleCancelDelete = () => {
    console.log('取消删除操作');
    setIsEditModalVisible(false);
    setRecordToDelete(null);
  };

  return (
    <div className="timelog-page p-4">

      <div className="controls-section bg-gray-50 p-4 rounded mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Title level={5} className="!m-0 whitespace-nowrap">选择日期范围:</Title>
            <RangePicker
              value={dateRange}
              onChange={(_, dateStrings) => {
                const start = dateStrings[0] ? dayjs(dateStrings[0]) : null;
                const end = dateStrings[1] ? dayjs(dateStrings[1]) : null;
                setDateRange([start, end]);
              }}
              allowClear={false}
              className="flex-grow md:flex-grow-0"
              disabled={deleting}
            />
            <Button
              type="default"
              onClick={() => fetchTimelogs()}
              loading={loading && !deleting}
              disabled={loading || deleting}
              className="flex-shrink-0"
            >
               🔍 查询
            </Button>
          </div>
          <Button
            type="primary"
            onClick={() => setIsAddModalVisible(true)}
            disabled={deleting}
          >
            + 添加新记录
          </Button>
      </div>

      <div className="charts-section mt-8 p-4 bg-white rounded-lg shadow-md">
                <Title level={3} className="mb-4">📊 时间数据洞察</Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Title level={4} className="!m-0 whitespace-nowrap">⏳ 时间线视图日期:</Title>
                        <DatePicker
                            value={timelineDate}
                            onChange={(date) => setTimelineDate(date || dayjs())} // 更新时间线日期 state
                            allowClear={false}
                            disabled={timelineLoading} // 加载时禁用
                        />
                         <Button onClick={() => fetchTimelineData()} loading={timelineLoading} size="small">刷新</Button>
                    </div>
                    <div className="chart-container border p-4 rounded bg-white min-h-[150px]"> {/* 时间线可以矮一点 */}
                        {timelineLoading ? (
                            <div className="flex justify-center items-center h-full"><Spin tip="加载时间线数据..."/></div>
                        ) : timelineError ? (
                             <div className="text-center text-red-500 pt-5">{timelineError}</div>
                        ): timelineRawData.length > 1 ? ( // 需要至少 起始点 + 1条 才能画
                           <TimelineChart
                                data={timelineRawData}
                                startDate={timelineDate.startOf('day')}
                                endDate={timelineDate.isSame(dayjs(), 'day') ? dayjs() : timelineDate.endOf('day')}
                            />
                        ) : (
                             <div className="text-center text-gray-500 pt-10">这一天没有足够的时间记录来绘制时间线喵... (｡•́︿•̀｡)</div>
                        )}
                    </div>
                    <div className="chart-container border p-4 rounded bg-gray-50 min-h-[300px]">
                        <Title level={4} className="text-center mb-2">标签时长占比 (饼图)</Title>
                        {loading ? (
                            <div className="flex justify-center items-center h-full"><Spin tip="加载中..."/></div>
                        ) : pieChartData.length > 0 ? (
                            <TagPieChart data={pieChartData} innerRadiusRatio={0.5} />
                        ) : (
                             <div className="text-center text-gray-500 pt-10">没有足够的数据计算饼图喵... (｡•́︿•̀｡)</div>
                        )}
                    </div>
                    <div className="chart-container border p-4 rounded bg-gray-50 min-h-[300px]">
                        <Title level={4} className="text-center mb-2">标签时长排行 (柱状图)</Title>
                        {loading ? (
                            <div className="flex justify-center items-center h-full"><Spin tip="加载中..."/></div>
                        ) : pieChartData.length > 0 ? (
                            <TagBarChart data={pieChartData} />
                        ) : (
                             <div className="text-center text-gray-500 pt-10">没有足够的数据计算柱状图喵... (｡•́︿•̀｡)</div>
                        )}
                    </div>
                </div>
            </div>

      <TimeLogTable
        timelogs={timelogs}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddTimelogModal
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          onSuccess={handleAddSuccess}
       />
       <EditTimelogModal
            visible={isEditModalVisible}
            onCancel={handleEditCancel}
            onSuccess={handleEditSuccess}
            initialData={recordToEdit}
       />
       <Modal
        title="🗑️ Master 确定要删除这条记录吗喵?"
        open={recordToDelete !== null}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText="确定删除!"
        okType="danger"
        cancelText="再想想..."
        confirmLoading={deleting}
      >
        <p>删除 ID 为 <strong className="text-red-500">{recordToDelete}</strong> 的记录后就无法恢复了哦，请谨慎操作喵！QAQ</p>
      </Modal>

       {deleting && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1050]">
          <Spin tip="正在删除中..." size="large" />
        </div>
       )}

    </div>
  );
};

export default TimeLogPage;