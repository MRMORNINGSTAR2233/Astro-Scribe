#!/bin/bash

# NASA Knowledge Search Engine Setup Script

echo "🚀 Setting up NASA Knowledge Search Engine..."

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

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env .env.backup 2>/dev/null || true
    
    echo "⚠️  Please edit the .env file and add your API keys:"
    echo "   - GROQ_API_KEY: Get from https://console.groq.com/"
    echo "   - GOOGLE_API_KEY: Get from https://console.cloud.google.com/"
    echo ""
    read -p "Press Enter after you've updated the API keys in .env file..."
fi

# Check if API keys are set
if ! grep -q "your_groq_api_key_here" .env && ! grep -q "your_google_api_key_here" .env; then
    echo "✅ API keys appear to be configured"
else
    echo "⚠️  Warning: API keys may not be properly configured"
    echo "   Please check your .env file and ensure GROQ_API_KEY and GOOGLE_API_KEY are set"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p logs

# Pull Docker images
echo "📥 Pulling Docker images..."
docker-compose pull

# Start the services
echo "🐳 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "🔍 Checking service status..."

# Check PostgreSQL
if docker-compose exec postgres pg_isready -U nasa_user > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check Neo4j
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Neo4j is ready"
else
    echo "❌ Neo4j is not ready"
fi

# Check Streamlit app
if curl -s http://localhost:8501 > /dev/null 2>&1; then
    echo "✅ Streamlit app is ready"
else
    echo "❌ Streamlit app is not ready"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🌐 Access the application:"
echo "   Main App: http://localhost:8501"
echo "   Neo4j Browser: http://localhost:7474"
echo ""
echo "📋 Next steps:"
echo "   1. Open http://localhost:8501 in your browser"
echo "   2. Go to the Upload page to add documents"
echo "   3. Start chatting with your NASA knowledge base!"
echo ""
echo "🔧 Useful commands:"
echo "   Stop services: docker-compose down"
echo "   View logs: docker-compose logs"
echo "   Restart: docker-compose restart"
echo ""
echo "💡 Tip: Check the Dashboard for system status and analytics"