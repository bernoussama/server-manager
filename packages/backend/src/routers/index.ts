import { router } from '../trpc'; // Assuming your main tRPC init file exports 'router'

import { authRouter } from './auth';
import { dnsRouter } from './dns';
import { servicesRouter } from './services';
import { systemMetricsRouter } from './systemMetrics';
import { usersRouter } from './users';

export const appRouter = router({
  auth: authRouter,
  dns: dnsRouter,
  services: servicesRouter,
  systemMetrics: systemMetricsRouter,
  users: usersRouter,
  // You can also merge routers using router.merge() if preferred,
  // for example, if routers are prefixed:
  // ...authRouter.prefix('/auth'), // This syntax is for other libraries, tRPC uses direct nesting
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
