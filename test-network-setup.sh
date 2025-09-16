#!/bin/bash

# Multi-Computer Testing Setup Verification Script

echo "🚀 Testing Multi-Computer Video Meeting Setup"
echo "=============================================="
echo

# Get IP address
IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}' | cut -d'/' -f1)
echo "📍 Your IP Address: $IP"
echo

# Test backend connectivity
echo "🔧 Testing Backend API..."
HEALTH_RESPONSE=$(curl -s http://$IP:4000/api/health)
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo "✅ Backend API is accessible at: http://$IP:4000/api"
else
    echo "❌ Backend API not accessible. Make sure backend is running."
    echo "   Run: cd /home/hafizo/Projects/project_mgmt/backend && npm run dev"
fi
echo

# Check if firewall ports are open
echo "🔒 Checking Firewall Ports..."
if netstat -tuln | grep -q ":4000 "; then
    echo "✅ Port 4000 (Backend) is open"
else
    echo "❌ Port 4000 (Backend) not accessible"
fi

if netstat -tuln | grep -q ":8080 "; then
    echo "✅ Port 8080 (Frontend) is ready"
else
    echo "ℹ️  Port 8080 (Frontend) will be available when you start the frontend"
fi
echo

# Display URLs for testing
echo "🌐 URLs for Testing:"
echo "   Frontend (from any computer):  http://$IP:8080"
echo "   Backend API (from any computer): http://$IP:4000/api"
echo "   Health Check: http://$IP:4000/api/health"
echo

# Display next steps
echo "📋 Next Steps:"
echo "1. Start Frontend: cd /home/hafizo/Projects/project_mgmt/frontend && npm run dev:network"
echo "2. On this computer: Open http://localhost:8080 or http://$IP:8080"
echo "3. On other computer: Open http://$IP:8080"
echo "4. Login with different users and test video meetings"
echo

echo "✨ Setup verification complete!"