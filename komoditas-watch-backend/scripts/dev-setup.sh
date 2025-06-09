#!/bin/bash

# Development setup script for Komoditas Watch Backend
# This script automates the initial setup process

set -e

echo "🚀 Setting up Komoditas Watch Backend Development Environment"
echo "============================================================"

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed"
        exit 1
    fi
    
    echo "✅ All requirements met"
}

# Create environment file
setup_env() {
    echo "📝 Setting up environment variables..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update .env file with your specific configuration"
    else
        echo "ℹ️  .env file already exists, skipping..."
    fi
}

# Install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
}

# Start Docker services
start_services() {
    echo "🐳 Starting Docker services..."
    
    # Check if services are already running
    if docker-compose ps | grep -q "Up"; then
        echo "ℹ️  Some services are already running"
        docker-compose down
        echo "🔄 Restarting services..."
    fi
    
    # Start PostgreSQL and Redis
    docker-compose up -d postgres redis
    
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Wait for PostgreSQL to be ready
    echo "🔍 Checking PostgreSQL connection..."
    until docker-compose exec postgres pg_isready -U postgres -d komoditas_watch; do
        echo "⏳ Waiting for PostgreSQL..."
        sleep 2
    done
    
    # Wait for Redis to be ready
    echo "🔍 Checking Redis connection..."
    until docker-compose exec redis redis-cli ping; do
        echo "⏳ Waiting for Redis..."
        sleep 2
    done
    
    echo "✅ Services are ready"
}

# Setup database
setup_database() {
    echo "🗄️  Setting up database..."
    
    # Generate Prisma client
    echo "🔧 Generating Prisma client..."
    npm run prisma:generate
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npm run prisma:migrate
    
    # Seed database
    echo "🌱 Seeding database with initial data..."
    npm run prisma:seed
    
    echo "✅ Database setup completed"
}

# Main setup process
main() {
    check_requirements
    setup_env
    install_deps
    start_services
    setup_database
    
    echo ""
    echo "🎉 Development environment setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Review and update .env file if needed"
    echo "2. Start the development server: npm run dev"
    echo "3. Open API documentation: http://localhost:3000/api/docs"
    echo "4. Test health endpoint: http://localhost:3000/api/v1/health"
    echo ""
    echo "🔑 Test credentials:"
    echo "Admin: admin@komoditaswatch.id / admin123"
    echo "Regulator: regulator@kemendag.go.id / regulator123"
    echo ""
    echo "🛠️  Additional tools:"
    echo "- Prisma Studio: npm run prisma:studio (http://localhost:5555)"
    echo "- View logs: docker-compose logs -f"
    echo "- Stop services: docker-compose down"
}

# Handle interruption
trap 'echo "❌ Setup interrupted"; exit 1' INT

# Run main function
main "$@"
