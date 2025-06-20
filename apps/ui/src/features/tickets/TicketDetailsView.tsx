import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ticketsApi } from '@/lib/api/tickets';
import type { Ticket } from '@server-manager/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const TicketDetailsView = () => {
    const { id } = useParams<{ id: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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

        fetchTicket();
    }, [id]);

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
                        <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'in_progress' ? 'secondary' : 'outline'}>
                            {ticket.status}
                        </Badge>
                        <Badge variant="secondary">{ticket.priority}</Badge>
                    </div>
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