export const ticketStatusEnum = ['open', 'in_progress', 'closed'] as const;
export const ticketPriorityEnum = ['low', 'medium', 'high'] as const;

export type TicketStatus = (typeof ticketStatusEnum)[number];
export type TicketPriority = (typeof ticketPriorityEnum)[number];

export interface Ticket {
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    userId: number;
    assigneeId: number | null;
    createdAt: Date;
    updatedAt: Date;
    creator?: {
        id: number;
        email: string;
    };
    assignee?: {
        id: number;
        email: string;
    };
}

export interface NewTicket {
    title: string;
    description: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    userId: number;
    assigneeId?: number | null;
} 