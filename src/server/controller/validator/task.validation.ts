import z from "zod";

export const createTaskSchema = z.object({
    title: z.string().min(1),
    desc: z.string().min(1),
    status: z.enum(['todo', 'in_progress', 'done']),
    deadline: z.string().datetime(),
  });
  
  export const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    desc: z.string().min(1).optional(),
    status: z.enum(['todo', 'in_progress', 'done']).optional(),
    deadline: z.string().datetime().optional(),
  });