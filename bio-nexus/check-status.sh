#!/bin/bash

echo "🐳 Bio-Nexus Docker Status Check"
echo "================================="

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🏥 Health Check:"
curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo "Health endpoint not available or jq not installed"

echo ""
echo "📱 Application Access:"
echo "Web UI: http://localhost:3000"
echo "PostgreSQL: localhost:5432"
echo "Neo4j: http://localhost:7474"
echo "Redis: localhost:6379"

echo ""
echo "📋 Quick Tests:"
echo -n "Main page: "
if curl -s -I http://localhost:3000 | grep -q "200 OK"; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

echo -n "Health endpoint: "
if curl -s http://localhost:3000/api/health | grep -q "healthy"; then
    echo "✅ OK"
else
    echo "❌ Failed"
fi

echo ""
echo "📝 Recent Application Logs (last 10 lines):"
docker-compose logs --tail=10 app

echo ""
echo "🎯 To view live logs: docker-compose logs -f"
echo "🛑 To stop services: docker-compose down"
echo "🔄 To restart: docker-compose restart"