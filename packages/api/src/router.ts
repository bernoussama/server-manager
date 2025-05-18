import { router } from './trpc';
import { userRouter } from './routers/user';
import { serviceRouter } from './routers/service';
import { dnsRouter } from './routers/dns';

// Create the app router with all sub-routers
export const appRouter = router({
  user: userRouter,
  service: serviceRouter,
  dns: dnsRouter,
});

// Export type definition of the API router
export type AppRouter = typeof appRouter; 