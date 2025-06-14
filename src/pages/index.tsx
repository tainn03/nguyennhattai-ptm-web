import { useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select } from 'antd';
import { useTasks } from '../hooks/useTasks';
import { Task } from '../server/domain/task/task.entity';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient();

const TaskPage = () => {
    const { user } = useAuthStore();
    if (!user) return <div>Please log in</div>;
    const { tasks, isLoading, createTask, updateTask, deleteTask } = useTasks();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const showModal = (task?: Task) => {
        setEditingTask(task || null);
        form.setFieldsValue(
            task
                ? { ...task, deadline: moment(task.deadline) }
                : { status: 'todo', deadline: moment() },
        );
        setIsModalVisible(true);
    };

    const handleOk = () => {
        form.validateFields().then((values) => {
            const taskData = {
                ...values,
                deadline: values.deadline.toDate(),
            };
            if (editingTask) {
                updateTask({ id: editingTask.id, task: taskData });
            } else {
                createTask(taskData);
            }
            setIsModalVisible(false);
            form.resetFields();
        });
    };

    const columns = [
        { title: 'Title', dataIndex: 'title', key: 'title' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        { title: 'Status', dataIndex: 'status', key: 'status' },
        { title: 'Deadline', dataIndex: 'deadline', key: 'deadline', render: (date: Date) => moment(date).format('YYYY-MM-DD') },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Task) => (
                <>
                    <Button onClick={() => showModal(record)}>Edit</Button>
                    <Button danger onClick={() => deleteTask(record.id)} style={{ marginLeft: 8 }}>
                        Delete
                    </Button>
                </>
            ),
        },
    ];

    return (
        <div style={{ padding: '20px' }}>
            <Button type="primary" onClick={() => showModal()}>Create Task</Button>
            <Table dataSource={tasks} columns={columns} loading={isLoading} rowKey="id" style={{ marginTop: '20px' }} />
            <Modal
                title={editingTask ? 'Edit Task' : 'Create Task'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter a description' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Please select a status' }]}>
                        <Select>
                            <Select.Option value="todo">Todo</Select.Option>
                            <Select.Option value="in_progress">In Progress</Select.Option>
                            <Select.Option value="done">Done</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="deadline" label="Deadline" rules={[{ required: true, message: 'Please select a deadline' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TaskPage />
    </QueryClientProvider>
);

export default App;