import { appRouter, type Context } from '@ts-node-express/api';
import { type AuthRequest } from '../middlewares/authMiddleware';
import { getCurrentDnsConfiguration, updateDnsConfiguration } from '../controllers/dnsController';

// Create router implementation
export const createRouter = () => {
  return {
    dns: {
      getConfig: async () => {
        // Create a mock request/response to reuse the existing controller
        const req = {} as AuthRequest;
        const res = {
          status: (code: number) => ({
            json: (data: any) => data
          })
        } as any;
        
        return await getCurrentDnsConfiguration(req, res);
      },
      
      updateConfig: async ({ input }: { input: any }) => {
        // Create a mock request/response to reuse the existing controller
        const req = {
          body: input
        } as AuthRequest;
        const res = {
          status: (code: number) => ({
            json: (data: any) => data
          })
        } as any;
        
        return await updateDnsConfiguration(req, res);
      }
    }
  }
}; 