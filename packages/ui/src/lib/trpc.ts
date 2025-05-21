import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '../../../backend/src/routers'; // Adjust path as necessary

// Create a tRPC client instance with React Query integration
export const t = createTRPCReact<AppRouter>();

// Create a new QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default query options can go here, e.g.:
      // staleTime: 1000 * 60 * 5, // 5 minutes
      // refetchOnWindowFocus: false,
    },
  },
});

// Configure the tRPC client
export const trpcClient = t.createClient({
  links: [
    httpBatchLink({
      url: '/trpc', // URL of your tRPC server
      // You can pass any headers you need here, e.g., for authentication
      // async headers() {
      //   return {
      //     authorization: getAuthCookie(),
      //   };
      // },
    }),
  ],
  // Optional: if you use superjson or other transformers, configure them here
  // transformer: superjson,
});

// For convenience, you can also export the AppRouter type if needed elsewhere in the UI
export type { AppRouter } from '../../../backend/src/routers';
