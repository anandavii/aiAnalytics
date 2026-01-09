#!/bin/bash

# AI Analytics Dashboard - Quick Start Script

echo "========================================"
echo "   AI Analytics Dashboard Launcher"
echo "========================================"

# Check for API Key
if [ ! -f "v1.0/backend/.env" ]; then
    echo "⚠️  WARNING: v1.0/backend/.env file not found!"
    echo "   Please create it and add your GEMINI_API_KEY."
    echo "   cp v1.0/.env.example v1.0/backend/.env"
    echo "========================================"
    sleep 2
fi

# Function to kill all child processes on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# Check and release ports
echo "🔍 Checking ports..."
for PORT in 8000 3000; do
    PID=$(lsof -ti :$PORT)
    if [ ! -z "$PID" ]; then
        echo "⚠️  Port $PORT is in use (PID: $PID). Killing it..."
        kill -9 $PID
    fi
done

# Start Backend
echo "🚀 Starting Backend (FastAPI)..."
cd v1.0/backend || exit
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:8000"

# Start Frontend
echo "🚀 Starting Frontend (Next.js)..."
cd ../frontend || exit
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running on http://localhost:3000"

echo "========================================"
echo "   App is running! Press Ctrl+C to stop."
echo "========================================"

# Wait for processes
wait
