import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateTicketSchema, ticketPriorityEnum, ticketStatusEnum, type User } from '@server-manager/shared';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ticketsApi, type UpdateTicketPayload } from '@/lib/api/tickets';
import { useToast } from '@/hooks/use-toast';
import type { Ticket } from '@server-manager/shared';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/users';

type EditTicketFormValues = z.infer<typeof updateTicketSchema>;

interface EditTicketModalProps {
    ticket: Ticket;
    onTicketUpdated: (updatedTicket: Ticket) => void;
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({ ticket, onTicketUpdated }) => {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const fetchedUsers = await usersApi.getAllUsers();
                setUsers(fetchedUsers);
            } catch (error) {
                toast({ title: 'Failed to fetch users', variant: 'destructive' });
            }
        };
        fetchUsers();
    }, [toast]);

    const form = useForm<EditTicketFormValues>({
        resolver: zodResolver(updateTicketSchema),
        defaultValues: {
            status: ticket.status,
            priority: ticket.priority,
            assigneeId: ticket.assigneeId,
        },
    });

    const onSubmit = async (data: EditTicketFormValues) => {
        try {
            const result = await ticketsApi.updateTicket(ticket.id, data as UpdateTicketPayload);
            toast({ title: 'Ticket updated successfully' });
            onTicketUpdated(result.ticket);
            setIsOpen(false);
        } catch (error) {
            // error is handled by api client
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Ticket</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ticketStatusEnum.map(status => (
                                                <SelectItem key={status} value={status}>{status}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Priority</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ticketPriorityEnum.map(priority => (
                                                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="assigneeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assign To</FormLabel>
                                    <Select 
                                        onValueChange={(value) => field.onChange(value === 'null' ? null : parseInt(value, 10))} 
                                        defaultValue={field.value ? field.value.toString() : 'null'}
                                    >
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="null">Unassigned</SelectItem>
                                            {users.map(user => (
                                                <SelectItem key={user.id} value={user.id.toString()}>{user.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}; 