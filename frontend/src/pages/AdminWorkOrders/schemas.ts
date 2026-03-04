// Zod schemas and form types for AdminWorkOrdersPage
import * as z from 'zod';
import { WorkOrderPriority } from '../../types/api';

export const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  priority: z.nativeEnum(WorkOrderPriority),
  dueDate: z.string().min(1, 'Due date is required'),
  assignedToUserId: z.string().optional(),
  files: z.any().optional(),
});

export type WorkOrderFormType = z.infer<typeof workOrderSchema>;
