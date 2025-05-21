import { z } from 'zod';

// Schema for allowed service names
export const allowedServiceSchema = z.enum(['named', 'dhcpd', 'httpd']);
export type AllowedServiceType = z.infer<typeof allowedServiceSchema>;

// Schema for service status
export const serviceStatusSchema = z.enum(['running', 'stopped', 'failed', 'unknown']);
export type ServiceStatusType = z.infer<typeof serviceStatusSchema>;

// Schema for a single service response object
export const serviceResponseSchema = z.object({
  service: allowedServiceSchema,
  status: serviceStatusSchema,
  message: z.string(),
});
export type ServiceResponseType = z.infer<typeof serviceResponseSchema>;

// Schema for the input when targeting a specific service for an action or query
export const serviceInputSchema = z.object({
  service: allowedServiceSchema,
});
export type ServiceInputType = z.infer<typeof serviceInputSchema>;
