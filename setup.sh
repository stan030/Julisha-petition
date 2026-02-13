#!/bin/bash

# Julisha Petition Platform - Quick Start Script

echo "╔═══════════════════════════════════════════════════╗"
echo "║   🇰🇪 JULISHA PETITION PLATFORM - QUICK SETUP     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Installing via Docker is recommended."
    echo ""
    read -p "Do you want to use Docker for database? (y/n): " use_docker
    
    if [ "$use_docker" = "y" ]; then
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is not installed. Please install Docker first."
            exit 1
        fi
        echo "✅ Using Docker for database"
        USE_DOCKER=true
    else
        echo "❌ Please install PostgreSQL manually and run this script again."
        exit 1
    fi
else
    echo "✅ PostgreSQL detected"
    USE_DOCKER=false
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Setup environment variables
if [ ! -f .env ]; then
    echo "🔧 Setting up environment variables..."
    cp .env.example .env
    
    # Generate random salts
    SERVER_SALT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your_secure_random_salt_here/$SERVER_SALT/" .env
        sed -i '' "s/your_admin_secret_here/$ADMIN_SECRET/" .env
    else
        # Linux
        sed -i "s/your_secure_random_salt_here/$SERVER_SALT/" .env
        sed -i "s/your_admin_secret_here/$ADMIN_SECRET/" .env
    fi
    
    echo "✅ Environment variables configured"
    echo ""
    echo "🔑 Your admin secret: $ADMIN_SECRET"
    echo "   Save this! You'll need it to access the admin dashboard."
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Setup database
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Starting PostgreSQL in Docker..."
    docker-compose up -d db
    
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    
    echo "✅ Database is ready"
else
    echo "🗄️  Setting up database..."
    read -p "Enter PostgreSQL username (default: postgres): " pg_user
    pg_user=${pg_user:-postgres}
    
    # Create database
    createdb -U $pg_user julisha_petition 2>/dev/null || echo "Database might already exist"
    
    echo "✅ Database setup complete"
fi

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║           🎉 SETUP COMPLETE!                      ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the application:"
echo ""
echo "   Backend API:"
echo "   $ npm start"
echo ""
echo "   Frontend (in a new terminal):"
echo "   $ python3 -m http.server 8000"
echo "   or"
echo "   $ npx http-server -p 8000"
echo ""
echo "📱 Access the platform:"
echo "   Frontend: http://localhost:8000"
echo "   Backend API: http://localhost:3000"
echo "   Admin Dashboard: http://localhost:8000/admin.html"
echo ""
echo "📖 For deployment instructions, see DEPLOYMENT.md"
echo ""
