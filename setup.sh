#!/bin/bash

echo "🚀 Setting up server-manager monorepo..."

if ! command -v bun &> /dev/null; then
    echo "Bun is required. Install from https://bun.sh"
    exit 1
fi

echo "📦 Installing workspace dependencies with Bun..."
cd "$(dirname "$0")" && bun install

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

echo "🗃️ Setting up database..."
cd apps/backend && bunx drizzle-kit generate && bunx drizzle-kit push && cd ../..

echo "✅ Setup completed successfully!"
echo 
echo "🚀 To start the development server:"
echo "  - Backend: cd apps/backend && bun run dev"
echo "  - UI:      cd apps/ui && bun run dev"
echo 
echo "🌐 Backend will be available at: http://localhost:3000"
echo "🌐 UI will be available at:      http://localhost:5173"