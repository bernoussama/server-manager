import { z } from 'zod';

export const httpdVHostConfigSchema = z.object({
  serverName: z.string().min(1, 'Server name is required'),
  documentRoot: z.string().min(1, 'Document root is required'),
  directoryIndex: z.string().optional(),
  errorLog: z.string().optional(),
  customLog: z.string().optional(),
  logFormat: z.string().optional(),
});

export type HttpdVHostConfigInput = z.infer<typeof httpdVHostConfigSchema>;
