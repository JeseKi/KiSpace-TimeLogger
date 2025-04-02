import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, Input, message, Button } from 'antd';
import dayjs from 'dayjs';
import { createTimelog, Timelog } from '../../Api';

interface AddTimelogModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

type FieldType = {
  timestamp: dayjs.Dayjs;
  activity: string;
  tag: string;
};

const AddTimelogModal: React.FC<AddTimelogModalProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm<FieldType>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (!form.getFieldValue('timestamp')) {
        form.setFieldsValue({ timestamp: dayjs() });
      }
    }
  }, [visible, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const newTimelog: Timelog = {
        timestamp: values.timestamp.toISOString(),
        activity: values.activity,
        tag: values.tag,
      };

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        message.error('未找到认证信息，请先登录喵！');
        setLoading(false);
        return;
      }

      await createTimelog(newTimelog, accessToken);

      message.success('新记录添加成功喵！🎉');
      form.resetFields();
      onSuccess();

    } catch (error: any) {
      if (error.errorFields) {
          message.warning('请检查表单输入是否正确喵！');
      } else {
          console.error('创建时间记录失败:', error);
          const errorMsg = error.response?.data?.detail || error.message || '添加记录时发生错误喵 T_T';
          message.error(`添加失败: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="✨ 添加新的时间记录"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
      footer={[
        <Button key="back" onClick={onCancel}>
          取消喵
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          确定喵
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="add_timelog_form"
      >
        <Form.Item<FieldType>
          name="timestamp"
          label="发生时间"
          rules={[{ required: true, message: '请选择时间喵！' }]}
        >
          <DatePicker 
            showTime 
            className="!w-full"
          />
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
          label="标签 "
          rules={[{ required: true, message: '请输入标签喵！' }]}
        >
          <Input placeholder="例如：工作, 学习, 项目A..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddTimelogModal;