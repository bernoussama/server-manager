### Implementation Plan: Ticketing System

This plan is divided into backend and frontend tasks, ensuring a full-stack implementation.

---

### 1. Backend (Node.js/Express)

#### 1.1. Database Schema

First, I'll define a new `tickets` table in your database using Drizzle ORM. I will place the new schema definition in `apps/backend/src/db/schema.ts`.

The `tickets` table will include fields like:
*   `id` (Primary Key)
*   `title` (String)
*   `description` (Text)
*   `status` (Enum: 'open', 'in_progress', 'closed')
*   `priority` (Enum: 'low', 'medium', 'high')
*   `userId` (Foreign Key to `users` table, for the creator)
*   `assigneeId` (Foreign Key to `users` table, for the assigned user, nullable)
*   `createdAt` and `updatedAt` timestamps

After defining the schema, I will generate a new database migration.

#### 1.2. Shared Types and Validators

To ensure type safety and consistent validation across the frontend and backend, I will create shared types and Zod validators in the `packages/shared` workspace.

*   **Types:** `packages/shared/src/types/tickets.ts`
*   **Validators:** `packages/shared/src/validators/ticketValidator.ts`

#### 1.3. API Endpoints

I'll create a new set of RESTful API endpoints for managing tickets.

*   **Controller:** `apps/backend/src/controllers/ticketController.ts`
*   **Routes:** `apps/backend/src/routes/ticketRoutes.ts`
*   **Endpoints:**
    *   `POST /api/tickets`: Create a new ticket.
    *   `GET /api/tickets`: List all tickets (with filtering options).
    *   `GET /api/tickets/:id`: Get details for a single ticket.
    *   `PUT /api/tickets/:id`: Update a ticket (e.g., status, priority, assignee).
    *   `DELETE /api/tickets/:id`: Delete a ticket.

#### 1.4. Business Logic & Authorization

The `ticketController.ts` will house the business logic. I will use your existing `authMiddleware` and `adminMiddleware` to secure the endpoints. The permissions would look something like this:
*   Any authenticated user can create a ticket.
*   Users can view and manage their own tickets.
*   Admins can view and manage all tickets.

---

### 2. Frontend (React/Vite)

#### 2.1. API Client

I will extend the frontend API client to include functions for interacting with the new ticket endpoints.

*   `apps/ui/src/lib/api/tickets.ts`

#### 2.2. UI Components

I will develop a new set of React components for the ticketing feature under `apps/ui/src/features/tickets/`.

*   `TicketList.tsx`: A table to display a list of tickets, likely using `shadcn/ui`.
*   `CreateTicketForm.tsx`: A form for creating new tickets.
*   `TicketDetailsView.tsx`: A view to display the details of a single ticket and allow for updates or comments.

#### 2.3. Routing and Navigation

Finally, I'll integrate the new feature into the UI.

*   A new route will be added for the tickets page (e.g., `/tickets`).
*   I will add a link to the "Tickets" page in the main sidebar navigation (`apps/ui/src/components/ui/sidebar.tsx`). 