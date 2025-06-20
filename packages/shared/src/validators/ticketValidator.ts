import { z } from 'zod';
import { ticketStatusEnum, ticketPriorityEnum } from '../types/tickets.js';

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(ticketPriorityEnum).optional(),
  userId: z.number(),
  assigneeId: z.number().optional().nullable(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  status: z.enum(ticketStatusEnum).optional(),
  priority: z.enum(ticketPriorityEnum).optional(),
  assigneeId: z.number().optional().nullable(),
});

export const createTicketFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(ticketPriorityEnum).optional(),
  assigneeId: z.number().optional().nullable(),
}); 