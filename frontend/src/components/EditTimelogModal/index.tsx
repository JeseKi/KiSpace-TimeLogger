import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Input, Button, message } from 'antd';
import dayjs from 'dayjs';
import { updateTimelog, Timelog } from '../../Api';

interface EditTimelogModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialData: Timelog | null;
}

type FieldType = {
  timestamp: dayjs.Dayjs;
  activity: string;
  tag?: string;
};

const EditTimelogModal: React.FC<EditTimelogModalProps> = ({ visible, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm<FieldType>();
  const [loading, setLoading] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        timestamp: initialData.timestamp ? dayjs(initialData.timestamp) : dayjs(),
        activity: initialData.activity,
        tag: initialData.tag,
      });
      setCurrentRecordId(initialData.uuid || null);
      console.log('currentRecordId:', currentRecordId, 'initialData:', initialData);
    } else if (!visible) {
      form.resetFields();
      setCurrentRecordId(null);
    }
  }, [visible, initialData, form]);

  const handleOk = async () => {
    console.log('handleOk', currentRecordId);
    if (!currentRecordId) {
        message.error('没有要编辑的记录 ID 喵！');
        return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const updatedTimelogData: Omit<Timelog, 'uuid'> = {
        timestamp: values.timestamp.toISOString(),
        activity: values.activity,
        tag: values.tag || '',
      };

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        message.error('未找到认证信息，请先登录喵！');
        setLoading(false);
        return;
      }

      await updateTimelog(currentRecordId, updatedTimelogData, accessToken);

      message.success('记录更新成功喵！🎉');
      onSuccess();

    } catch (error: any) {
      if (error.errorFields) {
        message.warning('请检查表单输入是否正确喵！');
      } else {
        console.error(`更新记录 (ID: ${currentRecordId}) 失败:`, error);
        const errorMsg = error.response?.data?.detail || error.message || '更新记录时发生错误喵 T_T';
        message.error(`更新失败: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="✏️ 编辑时间记录"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
      forceRender
      footer={[
        <Button key="back" onClick={onCancel}>
          取消喵
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          保存更改喵
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="edit_timelog_form"
      >
        <Form.Item<FieldType>
          name="timestamp"
          label="发生时间"
          rules={[{ required: true, message: '请选择时间喵！' }]}
        >
          <DatePicker showTime className="!w-full" />
        </Form.Item>

        <Form.Item<FieldType>
          name="activity"
          label="活动内容"
          rules={[{ required: true, message: '请输入活动内容喵！' }]}
        >
          <Input placeholder="例如：学习 React, 看文档, 撸代码..." />
        </Form.Item>

        <Form.Item<FieldType>
          name="tag"
          label="标签"
          rules={[{ required: true, message: '请输入标签喵！' }]}
        >
          <Input placeholder="例如：工作, 学习, 项目A..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTimelogModal;