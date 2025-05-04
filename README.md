# Server Manager

A full-stack application for managing and monitoring network services built with TypeScript, Express, and React.

![License](https://img.shields.io/badge/license-GPLv3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18.2-lightblue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB)

## 📋 Overview

Server Manager is a powerful web application for monitoring and controlling essential network services like DNS (bind), DHCP, and HTTP servers. It features a robust TypeScript/Express backend API and a modern React UI with a clean, responsive dashboard.

The application allows you to:

- Monitor system stats (CPU, memory, uptime)
- Start, stop, and restart network services
- Configure DNS, DHCP, and HTTP services
- View service logs and status information
- Manage user accounts

## 🔧 Tech Stack

### Backend
- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite (via libsql/drizzle-orm)
- **Validation**: Zod
- **Development Tools**: ESLint, Prettier, Nodemon

### Frontend
- **Language**: TypeScript
- **Framework**: React
- **UI Components**: Custom component library
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest

## 📁 Project Structure

```
├── src/               # Backend source code
│   ├── app.ts         # Express application setup
│   ├── server.ts      # Server entry point
│   ├── config/        # Configuration files
│   ├── controllers/   # API route controllers
│   ├── db/            # Database models and schema
│   ├── lib/           # Utility libraries
│   ├── middlewares/   # Express middlewares
│   ├── models/        # Data models
│   └── routes/        # API route definitions
├── ui/                # Frontend source code
│   ├── src/           # React application source
│   │   ├── components/# React components
│   │   ├── hooks/     # Custom React hooks
│   │   └── lib/       # Frontend utilities
│   ├── public/        # Static assets
│   └── index.html     # HTML entry point
├── drizzle/           # Database migrations
└── test/              # API tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager (recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bernoussama/server-manager.git
cd server-manager
```

2. Run the setup script to install dependencies and configure the environment:
```bash
./setup.sh
```

Alternatively, you can set up manually:

```bash
# Install backend dependencies
pnpm install

# Install frontend dependencies
cd ui && pnpm install && cd ..

# Create environment variables
cp .env.example .env

# Run database migrations
pnpm dlx drizzle-kit generate
pnpm dlx drizzle-kit push:sqlite
```

### Running the Application

#### Development Mode

Start the backend:
```bash
pnpm dev
```

Start the frontend (in a new terminal):
```bash
cd ui && pnpm dev
```

Your backend API will run at http://localhost:3000 and the UI will be available at http://localhost:5173.

#### Production Build

Build the application:
```bash
# Build backend
pnpm build

# Build frontend
cd ui && pnpm build
```

Run in production mode:
```bash
pnpm start
```

## 🔌 API Endpoints

### Services API

- `GET /api/services` - Get all services status
- `GET /api/services/:service` - Get specific service status
- `POST /api/services/:service/start` - Start a service
- `POST /api/services/:service/stop` - Stop a service
- `POST /api/services/:service/restart` - Restart a service

### Users API

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create a user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## 🧪 Testing

The project includes API tests that can be run with:

```bash
# Run backend tests
pnpm test

# Run frontend tests
cd ui && pnpm test
```

## 📋 Development Commands

Backend:
- `pnpm start` - Run production build
- `pnpm dev` - Run development server with hot reload
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

Frontend:
- `cd ui && pnpm dev` - Run development server
- `cd ui && pnpm build` - Build for production
- `cd ui && pnpm lint` - Run ESLint
- `cd ui && pnpm test` - Run tests

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