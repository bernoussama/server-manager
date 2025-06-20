import type { Response } from 'express';
import { ZodError } from 'zod';
import { eq } from 'drizzle-orm';
import { createTicketSchema, updateTicketSchema } from '@server-manager/shared';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { db } from '../lib/db.js';
import { tickets } from '../db/schema.js';

export const createTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const validatedData = createTicketSchema.parse({
            ...req.body,
            userId: req.user.id,
        });

        const newTicket = await db.insert(tickets).values(validatedData).returning();

        res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket[0] });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ message: 'Validation Error', errors: error.errors });
        }
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Failed to create ticket' });
    }
};

export const getAllTickets = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const allTickets = await db.query.tickets.findMany({
            with: {
                creator: {
                    columns: {
                        email: true,
                        id: true,
                    }
                },
                assignee: {
                    columns: {
                        email: true,
                        id: true,
                    }
                }
            },
            where: req.user.isAdmin ? undefined : eq(tickets.userId, req.user.id),
        });

        res.status(200).json(allTickets);
    } catch (error) {
        console.error('Error getting tickets:', error);
        res.status(500).json({ message: 'Failed to get tickets' });
    }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const ticketId = parseInt(req.params.id, 10);
        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'Invalid ticket ID' });
        }

        const ticket = await db.query.tickets.findFirst({
            where: eq(tickets.id, ticketId),
            with: {
                creator: {
                    columns: {
                        email: true,
                        id: true,
                    }
                },
                assignee: {
                    columns: {
                        email: true,
                        id: true,
                    }
                }
            }
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // If user is not an admin, they can only see their own tickets
        if (!req.user.isAdmin && ticket.userId !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.status(200).json(ticket);
    } catch (error) {
        console.error(`Error getting ticket by id:`, error);
        res.status(500).json({ message: 'Failed to get ticket' });
    }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
    // implementation pending
};

export const deleteTicket = async (req: AuthRequest, res: Response) => {
    // implementation pending
}; 