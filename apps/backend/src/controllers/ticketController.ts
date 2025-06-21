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
            }
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

        res.status(200).json(ticket);
    } catch (error) {
        console.error(`Error getting ticket by id:`, error);
        res.status(500).json({ message: 'Failed to get ticket' });
    }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const ticketId = parseInt(req.params.id, 10);
        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'Invalid ticket ID' });
        }

        const validatedData = updateTicketSchema.parse(req.body);

        // Fetch the ticket to check for ownership if user is not admin
        if (!req.user.isAdmin) {
            const ticket = await db.query.tickets.findFirst({
                where: eq(tickets.id, ticketId),
            });

            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }

            if (ticket.userId !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden: You can only update your own tickets' });
            }
        }
        
        const updatedTicket = await db.update(tickets)
            .set({ ...validatedData, updatedAt: new Date() })
            .where(eq(tickets.id, ticketId))
            .returning();

        if (updatedTicket.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json({ message: 'Ticket updated successfully', ticket: updatedTicket[0] });

    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ message: 'Validation Error', errors: error.errors });
        }
        console.error('Error updating ticket:', error);
        res.status(500).json({ message: 'Failed to update ticket' });
    }
};

export const deleteTicket = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const ticketId = parseInt(req.params.id, 10);
        if (isNaN(ticketId)) {
            return res.status(400).json({ message: 'Invalid ticket ID' });
        }

        // Fetch the ticket to check for ownership if user is not admin
        if (!req.user.isAdmin) {
            const ticket = await db.query.tickets.findFirst({
                where: eq(tickets.id, ticketId),
            });

            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }

            if (ticket.userId !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden: You can only delete your own tickets' });
            }
        }

        const deletedTicket = await db.delete(tickets).where(eq(tickets.id, ticketId)).returning();

        if (deletedTicket.length === 0) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ message: 'Failed to delete ticket' });
    }
}; 