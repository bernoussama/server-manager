#!/bin/bash

echo "🚀 Setting up ts-node-express project..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && pnpm install && cd ..

# Install UI dependencies
echo "📦 Installing UI dependencies..."
cd ui && pnpm install && cd ..

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=file:./backend/local.db
# Server Configuration
PORT=3000
# Add any other required environment variables here
EOL
    echo ".env file created successfully."
else
    echo ".env file already exists. Skipping..."
fi

# Run database migrations
echo "🗃️ Setting up database..."
cd backend && pnpm dlx drizzle-kit generate && cd ..
cd backend && pnpm dlx drizzle-kit push:sqlite && cd ..

echo "✅ Setup completed successfully!"
echo 
echo "🚀 To start the development server:"
echo "  - Backend: cd backend && pnpm dev"
echo "  - UI:      cd ui && pnpm dev"
echo 
echo "🌐 Backend will be available at: http://localhost:3000"
echo "🌐 UI will be available at:      http://localhost:5173"