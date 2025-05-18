import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { type AppRouter } from '@ts-node-express/api';

// Define API base URL
const getBaseUrl = () => {
  // In browser, use relative path or environment variable
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_URL || '/api';
  }
  
  // When rendering on the server, assume localhost
  return 'http://localhost:3000';
};

// Create tRPC client
export const trpc = createTRPCReact<AppRouter>();

// Create tRPC client config
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      // You can pass any HTTP headers you wish here
      headers() {
        return {
          Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        };
      },
    }),
  ],
}); 