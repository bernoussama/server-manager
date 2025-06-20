import apiClient from '../api';
import type { Ticket } from '@server-manager/shared';

// The NewTicket type from shared is not quite right for the form
export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
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
};

export default ticketsApi; 