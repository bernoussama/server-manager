import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketsApi } from '@/lib/api/tickets';
import type { Ticket } from '@server-manager/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditTicketModal } from './EditTicketModal';

export const TicketDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTicket = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const fetchedTicket = await ticketsApi.getTicketById(parseInt(id, 10));
            setTicket(fetchedTicket);
        } catch (err) {
            setError('Failed to fetch ticket details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;
        try {
            await ticketsApi.deleteTicket(parseInt(id, 10));
            toast({ title: 'Ticket deleted successfully' });
            navigate('/tickets');
        } catch (error) {
            // error is already handled and toasted
        }
    };

    const handleTicketUpdated = (updatedTicket: Ticket) => {
        setTicket(updatedTicket);
    }

    if (loading) {
        return <div>Loading ticket details...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!ticket) {
        return <div>Ticket not found.</div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{ticket.title}</CardTitle>
                        <CardDescription>Created on {new Date(ticket.createdAt).toLocaleString()}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <EditTicketModal ticket={ticket} onTicketUpdated={handleTicketUpdated} />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this ticket.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                    <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'in_progress' ? 'secondary' : 'outline'}>
                        {ticket.status}
                    </Badge>
                    <Badge variant="secondary">{ticket.priority}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Description</h3>
                        <p className="text-muted-foreground">{ticket.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold">Creator</h3>
                            <p className="text-muted-foreground">{ticket.creator?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold">Assignee</h3>
                            <p className="text-muted-foreground">{ticket.assignee?.email || 'Not assigned'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}; 