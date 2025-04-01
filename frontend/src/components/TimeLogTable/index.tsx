import React from 'react';
import { Table, Button, Spin, Alert, Space, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { Timelog } from '../../Api';
import Title from 'antd/es/typography/Title';

interface TimeLogTableProps {
  timelogs: Timelog[];
  loading: boolean;
  error: string | null;
  onEdit: (timelog: Timelog) => void;
  onDelete: (id: string) => void;
}

const TimeLogTable: React.FC<TimeLogTableProps> = ({
  timelogs,
  loading,
  error,
  onEdit,
  onDelete,
}) => {

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
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      render: (tag: string) => (
        tag ? <Tag>{tag}</Tag> : <Tag>未分类</Tag>
      ),
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

  return (
    <div className="timelog-table-wrapper mt-6">
      <Title level={3} className="mb-4">🕒 时间记录列表</Title>

      {loading && <Spin tip="正在努力加载数据喵..." size="large" className="block my-4" />}

      {error && !loading && (
        <Alert message="出错啦 T^T" description={error} type="error" showIcon className="mb-4" />
      )}

      {!loading && !error && (
        <Table
          columns={columns}
          dataSource={timelogs}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          className="shadow-md rounded-lg overflow-hidden"
        />
      )}
       {!loading && !error && timelogs.length === 0 && (
           <div className="text-center text-gray-500 mt-6">这段时间没有记录哦，快去添加吧！ฅ( ̳• ·̫ • ̳ฅ)</div>
       )}
    </div>
  );
};

export default TimeLogTable;