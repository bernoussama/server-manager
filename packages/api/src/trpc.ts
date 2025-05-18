import { initTRPC } from '@trpc/server';

// Define the context type - this will be expanded later to include auth, db, etc.
export interface Context {
  user?: {
    id: number;
    email: string;
  };
}

// Create a tRPC instance
const t = initTRPC.context<Context>().create();

// Export the basic procedures and router
export const router = t.router;
export const publicProcedure = t.procedure;

// Create a middleware for protected procedures
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error('Not authenticated');
  }
  return next({
    ctx: {
      // Add user info to context
      user: ctx.user,
    },
  });
});

// Export protected procedure
export const protectedProcedure = t.procedure.use(isAuthed); 