import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskAdapter } from '../adapter';
import { Task } from '../server/domain/task/task.entity';

export const useTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: taskAdapter.getTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: taskAdapter.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<Task> }) => taskAdapter.updateTask(id, task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: taskAdapter.deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return {
    tasks: tasks || [],
    isLoading,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
  };
};