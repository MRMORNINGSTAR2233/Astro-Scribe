#!/bin/bash

# Bio-Nexus Docker Startup Script
# This script helps you get Bio-Nexus running quickly with Docker

set -e

echo "🚀 Bio-Nexus Docker Startup Script"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found. Please create it with your API keys."
    echo "   You can copy .env.docker as a template:"
    echo "   cp .env.docker .env.local"
    exit 1
fi

# Check for required API keys
echo "🔍 Checking API keys..."
if grep -q "your_groq_api_key_here" .env.local; then
    echo "⚠️  Warning: GROQ_API_KEY not set in .env.local"
fi

if grep -q "your_gemini_api_key_here" .env.local; then
    echo "⚠️  Warning: GEMINI_API_KEY not set in .env.local"
fi

# Copy environment file for Docker
echo "📋 Setting up environment..."
cp .env.local .env.docker

# Export environment variables for docker-compose
echo "🔧 Loading environment variables..."
set -a
source .env.local
set +a

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check application
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy"
else
    echo "⚠️  Application health check failed"
fi

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is not ready"
fi

# Check Neo4j
if docker-compose exec -T neo4j cypher-shell -u neo4j -p neo4j_password "RETURN 1" > /dev/null 2>&1; then
    echo "✅ Neo4j is ready"
else
    echo "⚠️  Neo4j is not ready"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is not ready"
fi

echo ""
echo "🎉 Bio-Nexus is starting up!"
echo ""
echo "📱 Access your application:"
echo "   • Web App: http://localhost:3000"
echo "   • Health Check: http://localhost:3000/api/health"
echo "   • Neo4j Browser: http://localhost:7474"
echo ""
echo "🔧 Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart: docker-compose restart"
echo ""
echo "📊 Monitor services: docker-compose ps"

# Show running services
echo ""
echo "📊 Current service status:"
docker-compose ps