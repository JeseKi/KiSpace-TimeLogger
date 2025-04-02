import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Spin, Alert, Space, Tag, Modal, Checkbox, Typography, ColorPicker } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { Timelog } from '../../Api';
import Title from 'antd/es/typography/Title';
import { formatDuration } from '../../utils/formatters';
import { FilterOutlined } from '@ant-design/icons';

interface TimeLogTableProps {
  timelogs: Timelog[];
  loading: boolean;
  error: string | null;
  onEdit: (timelog: Timelog) => void;
  onDelete: (id: string) => void;
  onFilterTag: (tag: string) => void;
  selectedTags?: string[];
  allTimelogData?: Timelog[];
  onUpdateTagColor: (tag: string, color: string) => void;
}

const TimeLogTable: React.FC<TimeLogTableProps> = ({
  timelogs,
  loading,
  error,
  onEdit,
  onDelete,
  onFilterTag,
  selectedTags = [],
  allTimelogData = timelogs,
  onUpdateTagColor,
}) => {
  const [isTagFilterModalVisible, setIsTagFilterModalVisible] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([...selectedTags]);
  
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [currentEditingTag, setCurrentEditingTag] = useState<string>('');
  const [tempColor, setTempColor] = useState<string>('');
  
  const [tagColors, setTagColors] = useState<Record<string, string>>({});

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

  const getAllUniqueTags = useCallback(() => {
    return allTimelogData
      .map(log => log.tag)
      .filter((tag, index, self) => 
        tag && self.indexOf(tag) === index
      )
      .sort();
  }, [allTimelogData]);
  
  const showTagFilterModal = () => {
    setTempSelectedTags([...selectedTags]);
    setIsTagFilterModalVisible(true);
  };

  const openColorPicker = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentEditingTag(tag);
    setTempColor(tagColors[tag] || '');
    setIsColorPickerVisible(true);
  };
  
  const handleColorSelect = () => {
    if (currentEditingTag) {
      const newTagColors = { ...tagColors, [currentEditingTag]: tempColor };
      setTagColors(newTagColors);
      
      try {
        localStorage.setItem('timelogger_tag_colors', JSON.stringify(newTagColors));
      } catch (e) {
        console.error('Error saving tag colors to localStorage:', e);
      }
      onUpdateTagColor(currentEditingTag, tempColor);
    }
    setIsColorPickerVisible(false);
  };

  const handleTagCheckboxChange = (tag: string, checked: boolean) => {
    if (checked) {
      setTempSelectedTags(prev => [...prev, tag]);
    } else {
      setTempSelectedTags(prev => prev.filter(t => t !== tag));
    }
  };

  const applyTagFilter = () => {
    if (JSON.stringify(tempSelectedTags.sort()) !== JSON.stringify(selectedTags.sort())) {
      selectedTags.forEach(tag => onFilterTag(tag));
      tempSelectedTags.forEach(tag => onFilterTag(tag));
    }
    
    setIsTagFilterModalVisible(false);
  };

  const columns: TableColumnsType<Timelog> = [
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '活动内容',
      dataIndex: 'activity',
      key: 'activity',
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration),
    },
    {
      title: (
        <div 
          className="flex items-center cursor-pointer" 
          onClick={showTagFilterModal}
        >
          <span>标签</span>
          <FilterOutlined 
            className={`ml-1 ${selectedTags.length > 0 ? 'text-blue-500' : ''}`} 
          />
        </div>
      ),
      dataIndex: 'tag',
      key: 'tag',
      render: (tag: string) => {
        if (!tag) return <Tag>未分类</Tag>;
        
        return (
          <Tag 
            color={tagColors[tag] || undefined}
            className={`cursor-pointer ${selectedTags.includes(tag) ? 'font-bold' : ''}`}
            onClick={(e) => openColorPicker(tag, e)}
          >
            {tag}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: Timelog) => (
        <Space size="middle">
          <Button type="link" size="small" onClick={() => onEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => onDelete(record.uuid!)}>删除</Button>
        </Space>
      ),
    },
  ];

  const [pagination, setPagination] = useState({
    pageSize: 10,
    current: 1,
  });

  const handleTableChange = (newPagination: any) => {
    setPagination({
        ...pagination,
        ...newPagination,
    });
  };

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div className="timelog-table-wrapper mt-6">
      <Title level={3} className="mb-4">🕒 时间记录列表</Title>
      
      {loading && <Spin tip="正在努力加载数据喵..." size="large" className="block my-4" />}

      {error && !loading && (
        <Alert
          message="获取数据失败"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      <Table
        columns={columns}
        dataSource={timelogs}
        rowKey={record => record.uuid || ''}
        loading={loading}
        onChange={handleTableChange}
        pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
        }}
        className="shadow-md rounded-lg overflow-hidden"
      />
      
      {!loading && !error && timelogs.length === 0 && (
          <div className="text-center text-gray-500 mt-6">这段时间没有记录哦，快去添加吧！ฅ( ̳• ·̫ • ̳ฅ)</div>
      )}

      {/* 标签筛选模态框 */}
      <Modal
        title="选择要筛选的标签"
        open={isTagFilterModalVisible}
        onOk={applyTagFilter}
        onCancel={() => setIsTagFilterModalVisible(false)}
        width={400}
      >
        <div className="tag-filter-list" style={{ maxHeight: '300px', overflow: 'auto' }}>
          {getAllUniqueTags().length === 0 ? (
            <Typography.Text type="secondary">没有找到标签</Typography.Text>
          ) : (
            getAllUniqueTags().map(tag => (
              <div key={tag} className="mb-2">
                <Checkbox
                  checked={tempSelectedTags.includes(tag)}
                  onChange={e => handleTagCheckboxChange(tag, e.target.checked)}
                >
                  <Tag color={tagColors[tag] || undefined}>
                    {tag}
                  </Tag>
                </Checkbox>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <Button 
            type="link" 
            onClick={() => setTempSelectedTags([])}
            disabled={tempSelectedTags.length === 0}
          >
            清空选择
          </Button>
          <Button 
            type="link" 
            onClick={() => setTempSelectedTags(getAllUniqueTags())}
            disabled={getAllUniqueTags().length === 0 || tempSelectedTags.length === getAllUniqueTags().length}
          >
            全选
          </Button>
        </div>
      </Modal>

      <Modal
        title={`设置 "${currentEditingTag}" 标签颜色`}
        open={isColorPickerVisible}
        onOk={handleColorSelect}
        onCancel={() => setIsColorPickerVisible(false)}
        width={300}
      >
        <div className="color-picker-container">
          <ColorPicker
            value={tempColor}
            onChange={(color) => {
              const hexColor = color.toHexString();
              setTempColor(hexColor);
            }}
            presets={[
              {
                label: '推荐颜色',
                colors: [
                  '#F5222D', '#FA541C', '#FA8C16', '#FAAD14', '#FADB14', 
                  '#A0D911', '#52C41A', '#13C2C2', '#1677FF', '#2F54EB', 
                  '#722ED1', '#EB2F96'
                ],
              },
            ]}
          />
          <div className="mt-4">
            <Tag color={tempColor || undefined} style={{ margin: '0 auto', display: 'block', width: 'fit-content' }}>
              {currentEditingTag}
            </Tag>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TimeLogTable;