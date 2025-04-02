// src/pages/TimeLogPage/TimeLogPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Button, message, Typography, Modal, Spin, Tag } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { getTimelogs, Timelog, deleteTimelog } from '../../Api';
import TimeLogTable from './TimeLogTable';
import AddTimelogModal from './AddTimelogModal';
import EditTimelogModal from './EditTimelogModal';
import TagPieChart from './TagPieChart';
import TagBarChart from './TagBarChart';
import TimelineChart from './TimelineChart';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const TimeLogPage: React.FC = () => {
  // 数据状态管理
  const [timelogs, setTimelogs] = useState<Timelog[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([])
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

  // 标签颜色管理
  const [tagColors, setTagColors] = useState<Record<string, string>>({});

  // 从本地存储加载标签颜色
  useEffect(() => {
    try {
      const savedColors = localStorage.getItem('timelogger_tag_colors');
      if (savedColors) {
        setTagColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error('Error loading tag colors from localStorage:', e);
    }
  }, []);

  // 保存标签颜色到本地存储
  const saveTagColors = useCallback((newColors: Record<string, string>) => {
    setTagColors(newColors);
    try {
      localStorage.setItem('timelogger_tag_colors', JSON.stringify(newColors));
    } catch (e) {
      console.error('Error saving tag colors to localStorage:', e);
    }
  }, []);

  // 更新标签颜色
  const updateTagColor = useCallback((tag: string, color: string) => {
    const newColors = { ...tagColors, [tag]: color };
    saveTagColors(newColors);
  }, [tagColors, saveTagColors]);

  // 获取时间记录
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
        
        const sortedData = data.sort((a, b) => 
            dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
        );

        const processedData = sortedData.map((log, index, arr) => {
            if (index === 0) {
                return { ...log, duration: 0 };
            }
            
            const prevLog = arr[index - 1];
            const duration = dayjs(log.timestamp).diff(
                dayjs(prevLog.timestamp),
                'second'
            );
            
            return { ...log, duration };
        });

        setTimelogs(processedData);
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

  // 自动拉取指定范围内的时间记录
  useEffect(() => {
    fetchTimelogs();
  }, [fetchTimelogs]);

  // 自动拉取饼图/柱图数据
  useEffect(() => {
    if (timelogs && timelogs.length > 1) {

        const sortedTimelogs = [...timelogs].sort((a, b) =>
            dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
        );

        const durationByTag: { [key: string]: number } = {};

        for (let i = 1; i < sortedTimelogs.length; i++) {
            const currentRecord = sortedTimelogs[i];
            const previousRecord = sortedTimelogs[i - 1];

            const durationInSeconds = dayjs(currentRecord.timestamp).diff(dayjs(previousRecord.timestamp), 'second');

            const tag = currentRecord.tag || '未分类';

            durationByTag[tag] = (durationByTag[tag] || 0) + durationInSeconds;

        }

        const formattedPieData = Object.entries(durationByTag)
            .map(([tag, duration]) => ({
                label: tag,
                value: duration,
            }))
            .filter(item => item.value > 0);

        setPieChartData(formattedPieData);

    } else {
        setPieChartData([]);
    }
  }, [timelogs]);

  // 获取时间线数据
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

    const fetchStartDate = timelineDate.subtract(1, 'day').startOf('day');
    const fetchEndDate = timelineDate.add(2, 'day').startOf('day');

    const targetDayStart = timelineDate.startOf('day');
    const targetDayEnd = timelineDate.add(1, 'day').startOf('day');

    setTimelineLoading(true);
    setTimelineError(null);

    try {
        const allData = await getTimelogs(
            fetchStartDate.format('YYYY-MM-DDTHH:mm:ss'),
            fetchEndDate.format('YYYY-MM-DDTHH:mm:ss'),
            accessToken
        );

        const sortedData = allData.sort((a, b) =>
            dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix()
        );

        const timelineSegments: any[] = [];
        
        timelineSegments.push({
            uuid: 'day-start',
            timestamp: targetDayStart.toISOString(),
            endTime: targetDayStart.toISOString(),
            duration: 0,
            activity: '今日起始点',
            tag: '起始点',
        });

        for (let i = 0; i < sortedData.length; i++) {
          const curr = sortedData[i];
          const next = sortedData[i + 1];

          const segmentStart = dayjs(curr.timestamp);
          const segmentEnd = next ? dayjs(next.timestamp) : targetDayEnd;

          const activity = curr.activity;
          const tag = curr.tag;
          const uuid = curr.uuid;

          const overlapStart = dayjs(Math.max(segmentStart.valueOf(), targetDayStart.valueOf()));
          const overlapEnd = dayjs(Math.min(segmentEnd.valueOf(), targetDayEnd.valueOf()));

          if (overlapStart && overlapEnd && overlapStart.isBefore(overlapEnd)) {
              timelineSegments.push({
                  uuid,
                  timestamp: overlapStart.toISOString(),
                  endTime: overlapEnd.toISOString(),
                  duration: overlapEnd.diff(overlapStart, 'second'),
                  activity,
                  tag,
              });
          }
        }

        if (timelineSegments.length > 1) {
            const lastSegment = timelineSegments[timelineSegments.length - 1];
            if (dayjs(lastSegment.endTime).isSame(targetDayEnd)) {
                const nextDayFirstRecord = sortedData.find(record => 
                    dayjs(record.timestamp).isAfter(targetDayEnd)
                );
                
                if (nextDayFirstRecord) {
                    const endTime = targetDayEnd.subtract(1, 'second');
                    lastSegment.activity = nextDayFirstRecord.activity;
                    lastSegment.tag = nextDayFirstRecord.tag;
                    lastSegment.endTime = endTime.toISOString();
                    lastSegment.duration = dayjs(endTime).diff(dayjs(lastSegment.timestamp), 'second');
                }
            }
        }

        setTimelineRawData(timelineSegments);

    } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || '获取时间线数据时发生错误喵 T_T';
        setTimelineError(errorMsg);
        message.error(`获取时间线数据失败: ${errorMsg}`);
        setTimelineRawData([]);
    } finally {
        setTimelineLoading(false);
    }
}, [timelineDate]);

  // 自动拉取时间线数据
  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  const handleEdit = (record: Timelog) => {
    setRecordToEdit(record);
    setIsEditModalVisible(true);
  };

  const handleDelete = (id: string) => {
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
    setIsEditModalVisible(false);
    setRecordToDelete(null);
  };

  const handleFilterTag = (tag: string) => {
    console.log('Filtering by tag:', tag);
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // 如果已选中则移除
        return prev.filter(t => t !== tag);
      } else {
        // 如果未选中则添加
        return [...prev, tag];
      }
    });
  };

  // useMemo
  const filteredTimelogs = useMemo(() => {
    if (selectedTags.length === 0) return timelogs;
    
    return timelogs.filter(log => 
        log.tag && selectedTags.includes(log.tag)
    );
  }, [timelogs, selectedTags]);

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

      {selectedTags.length > 0 && (
        <div className="mb-4 flex items-center">
          <span className="mr-2">已选标签：</span>
          {selectedTags.map(tag => (
            <Tag 
              key={tag}
              color="blue"
              closable
              onClose={() => handleFilterTag(tag)}
              className="mr-1 cursor-pointer"
            >
              {tag}
            </Tag>
          ))}
          <Button 
            type="link" 
            size="small" 
            onClick={() => setSelectedTags([])}
          >
            清空筛选
          </Button>
        </div>
      )}

      <div className="charts-section mt-8 p-4 bg-white rounded-lg shadow-md">
                <Title level={3} className="mb-4">📊 时间数据洞察</Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Title level={4} className="!m-0 whitespace-nowrap">⏳ 时间线视图日期:</Title>
                        <DatePicker
                            value={timelineDate}
                            onChange={(date) => setTimelineDate(date || dayjs())}
                            allowClear={false}
                            disabled={timelineLoading}
                        />
                         <Button onClick={() => fetchTimelineData()} loading={timelineLoading} size="small">刷新</Button>
                    </div>
                    <div className="chart-container border p-4 rounded bg-white min-h-[150px]">
                        {timelineLoading ? (
                            <div className="flex justify-center items-center h-full"><Spin tip="加载时间线数据..."/></div>
                        ) : timelineError ? (
                             <div className="text-center text-red-500 pt-5">{timelineError}</div>
                        ): timelineRawData.length > 1 ? (
                           <TimelineChart
                                data={timelineRawData}
                                startDate={timelineDate.startOf('day')}
                                endDate={timelineDate.isSame(dayjs(), 'day') ? dayjs() : timelineDate.endOf('day')}
                                tagColors={tagColors}
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
                            <TagPieChart data={pieChartData} tagColors={tagColors} />
                        ) : (
                             <div className="text-center text-gray-500 pt-10">没有足够的数据计算饼图喵... (｡•́︿•̀｡)</div>
                        )}
                    </div>
                    <div className="chart-container border p-4 rounded bg-gray-50 min-h-[300px]">
                        <Title level={4} className="text-center mb-2">标签时长排行 (柱状图)</Title>
                        {loading ? (
                            <div className="flex justify-center items-center h-full"><Spin tip="加载中..."/></div>
                        ) : pieChartData.length > 0 ? (
                            <TagBarChart data={pieChartData} tagColors={tagColors} />
                        ) : (
                             <div className="text-center text-gray-500 pt-10">没有足够的数据计算柱状图喵... (｡•́︿•̀｡)</div>
                        )}
                    </div>
                </div>
            </div>

      <TimeLogTable
        timelogs={filteredTimelogs}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onFilterTag={handleFilterTag}
        selectedTags={selectedTags}
        allTimelogData={timelogs}
        onUpdateTagColor={updateTagColor}
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