import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketFormSchema, ticketPriorityEnum, type User } from '@server-manager/shared';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ticketsApi } from '@/lib/api/tickets';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/users';

type CreateTicketFormValues = z.infer<typeof createTicketFormSchema>;

export const CreateTicketForm = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);

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

    const form = useForm<CreateTicketFormValues>({
        resolver: zodResolver(createTicketFormSchema),
        defaultValues: {
            title: '',
            description: '',
            priority: 'medium',
            assigneeId: undefined,
        },
    });

    const onSubmit = async (data: CreateTicketFormValues) => {
        try {
            await ticketsApi.createTicket(data);
            toast({ title: 'Ticket created successfully' });
            navigate('/tickets');
        } catch (error) {
            // error is already handled and toasted by the api client
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter ticket title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the issue" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ticketPriorityEnum.map(priority => (
                                                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="assigneeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign To</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} defaultValue={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a user" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="null">Unassigned</SelectItem>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>{user.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit">Create Ticket</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}; 