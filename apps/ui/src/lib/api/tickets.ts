import apiClient from '../api';
import type { Ticket, TicketPriority, TicketStatus } from '@server-manager/shared';

// The NewTicket type from shared is not quite right for the form
export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: number | null;
}

export interface UpdateTicketPayload {
    title?: string;
    description?: string;
    priority?: TicketPriority;
    status?: TicketStatus;
    assigneeId?: number | null;
}

export const ticketsApi = {
    getTickets(): Promise<Ticket[]> {
        return apiClient.get('/tickets');
    },

    createTicket(ticket: CreateTicketPayload): Promise<{ message: string, ticket: Ticket }> {
        return apiClient.post('/tickets', ticket);
    },

    getTicketById(id: number): Promise<Ticket> {
        return apiClient.get(`/tickets/${id}`);
    },

    updateTicket(id: number, payload: UpdateTicketPayload): Promise<{ message: string, ticket: Ticket }> {
        return apiClient.patch(`/tickets/${id}`, payload);
    },

    deleteTicket(id: number): Promise<{ message: string }> {
        return apiClient.delete(`/tickets/${id}`);
    }
};

export default ticketsApi; 