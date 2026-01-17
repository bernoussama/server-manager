# Server Manager

A full-stack monorepo application for managing and monitoring network services built with TypeScript, Express, and React.

![License](https://img.shields.io/badge/license-GPLv3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18.2-lightblue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB)
[![CI](https://github.com/bernoussama/server-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/bernoussama/server-manager/actions/workflows/ci.yml)

## 📋 Overview

Server Manager is a powerful web application for monitoring and controlling essential network services like DNS (bind), DHCP, and HTTP servers. It features a robust TypeScript/Express backend API and a modern React UI with a clean, responsive dashboard.

The application allows you to:

- Monitor system metrics (CPU, memory, disk usage, uptime)
<img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/e2ec6b5e-48bc-4573-a938-4c6a0825e947" />

  
- Start, stop, and restart network services (named, dhcpd, httpd)
<img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/00d614dd-2b1c-44a4-a58e-46ef6cc04c66" />

  
- Configure DNS zones and records with bind integration
<img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/d897c207-cfc0-42d1-82e0-aa3c8ecedb6a" />
<img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/46ed9115-5e2e-4f70-ad08-4c01d18ce7d9" />

- Configure HTTP virtual hosts and Apache settings
  <img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/473fc569-71a5-49fc-9599-56a1431e3abb" />

- Configure DHCP server settings
  <img width="1600" height="860" alt="image" src="https://github.com/user-attachments/assets/55dc9ddd-b6d6-44ae-b26c-aa290c7cd4d6" />

- View service status and logs
- Manage user accounts with authentication

## 🔧 Tech Stack

### Backend (`apps/backend`)
- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod (via shared package)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Development Tools**: ESLint, Prettier, Nodemon, Jest

### Frontend (`apps/ui`)
- **Language**: TypeScript
- **Framework**: React 18
- **UI Components**: Custom component library with shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest
- **State Management**: React Hook Form
- **HTTP Client**: Fetch API with custom wrapper

### Shared (`packages/shared`)
- **Types**: Shared TypeScript interfaces and types
- **Validators**: Zod schemas for data validation
- **Transformers**: Data transformation utilities

### Infrastructure
- **Monorepo**: Turborepo with pnpm workspaces
- **Package Manager**: pnpm
- **Containerization**: Docker support

## 📁 Project Structure

```
ts-node-express/
├── apps/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   │   ├── controllers/  # API route controllers
│   │   │   │   ├── authController.ts
│   │   │   │   ├── dnsController.ts
│   │   │   │   ├── httpController.ts
│   │   │   │   ├── servicesController.ts
│   │   │   │   ├── systemMetricsController.ts
│   │   │   │   └── usersController.ts
│   │   │   ├── db/           # Database configuration
│   │   │   ├── lib/          # Utility libraries
│   │   │   ├── middlewares/  # Express middlewares
│   │   │   ├── models/       # Data models
│   │   │   ├── routes/       # API route definitions
│   │   │   └── types/        # Type definitions
│   │   ├── drizzle/          # Database migrations
│   │   └── test/             # API tests and config files
│   └── ui/                   # React frontend application
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── features/     # Feature-specific components
│           │   ├── configuration/
│           │   │   ├── dns/
│           │   │   ├── dhcp/
│           │   │   └── http/
│           │   ├── dashboard/
│           │   └── services/
│           ├── hooks/        # Custom React hooks
│           ├── lib/          # Frontend utilities and API clients
│           └── pages/        # Page components
├── packages/
│   └── shared/               # Shared code between apps
│       └── src/
│           ├── types/        # TypeScript type definitions
│           └── validators/   # Zod validation schemas
├── docs/                     # Documentation
└── Configuration files (package.json, turbo.json, etc.)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bernoussama/server-manager.git
cd server-manager
```

2. Install dependencies using pnpm workspaces:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example environment file
cp apps/backend/.env.example apps/backend/.env

# Edit the .env file with your configuration
```

4. Set up the database:
```bash
# Generate and run database migrations
cd apps/backend
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit push
```

### Running the Application

#### Development Mode

Start all applications in development mode:
```bash
# From root directory
pnpm dev
```

Or start individual applications:

```bash
# Start backend only
cd apps/backend && pnpm dev

# Start frontend only (in a new terminal)
cd apps/ui && pnpm dev
```

Your backend API will run at http://localhost:3000 and the UI will be available at http://localhost:5173.

#### Production Build

Build all applications:
```bash
pnpm build
```

Run in production mode:
```bash
# Start backend
cd apps/backend && pnpm start

# Serve frontend (after building)
cd apps/ui && pnpm preview
```

## 🔌 API Endpoints

### Authentication API
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

### Services API
- `GET /api/services` - Get all services status
- `GET /api/services/:service` - Get specific service status
- `POST /api/services/:service/start` - Start a service
- `POST /api/services/:service/stop` - Stop a service
- `POST /api/services/:service/restart` - Restart a service

### DNS API
- `GET /api/dns/config` - Get DNS configuration
- `PUT /api/dns/config` - Update DNS configuration

### HTTP API
- `GET /api/http/config` - Get HTTP configuration
- `PUT /api/http/config` - Update HTTP configuration
- `POST /api/http/validate` - Validate HTTP configuration
- `GET /api/http/status` - Get HTTP service status
- `POST /api/http/service/:action` - Control HTTP service

### System Metrics API
- `GET /api/system-metrics` - Get system performance metrics

### Users API
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create a user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## 🧪 Testing

Run tests for the entire monorepo:
```bash
pnpm test
```

Run tests for individual applications:
```bash
# Backend tests
cd apps/backend && pnpm test

# Frontend tests
cd apps/ui && pnpm test

# Shared package tests
cd packages/shared && pnpm test
```

## 📋 Development Commands

### Root level (affects all workspaces):
- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm test` - Run tests for all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code in all packages

### Backend (`apps/backend`):
- `pnpm start` - Run production build
- `pnpm dev` - Run development server with hot reload
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run Jest tests

### Frontend (`apps/ui`):
- `pnpm dev` - Run development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run Vitest tests

### Shared (`packages/shared`):
- `pnpm build` - Build shared package
- `pnpm test` - Run tests
- `pnpm lint` - Run ESLint

## 🏗️ Architecture

The application follows a modern monorepo architecture:

- **Turborepo**: Manages the monorepo with optimized build caching and task orchestration
- **Shared Package**: Contains common types, validators, and utilities used by both frontend and backend
- **Type Safety**: End-to-end type safety with shared TypeScript interfaces
- **API-First Design**: RESTful API with comprehensive validation using Zod schemas
- **Component-Based UI**: Modular React components with feature-based organization

## 🐳 Docker Support

The backend includes Docker support:

```bash
# Build Docker image
cd apps/backend
docker build -t server-manager-backend .

# Run with Docker
docker run -p 3000:3000 server-manager-backend
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GPLv3 License.

## 📞 Contact

Project Link: [https://github.com/bernoussama/server-manager](https://github.com/bernoussama/server-manager)
