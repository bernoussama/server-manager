import { useEffect, useState } from 'react';
import { ticketsApi } from '@/lib/api/tickets';
import type { Ticket } from '@server-manager/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export const TicketList = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const fetchedTickets = await ticketsApi.getTickets();
                setTickets(fetchedTickets);
            } catch (err) {
                setError('Failed to fetch tickets');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    if (loading) {
        return <div>Loading tickets...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Tickets</CardTitle>
                    <Button onClick={() => navigate('/tickets/new')}>Create Ticket</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell>{ticket.title}</TableCell>
                                <TableCell>{ticket.status}</TableCell>
                                <TableCell>{ticket.priority}</TableCell>
                                <TableCell>{ticket.assignee?.email || 'Unassigned'}</TableCell>
                                <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}; 