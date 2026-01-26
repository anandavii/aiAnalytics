#!/bin/bash

# AI Analytics Dashboard - Quick Start Script

echo "========================================"
echo "   AI Analytics Dashboard Launcher"
echo "========================================"

# Check for API Key
if [ ! -f "backend/.env" ]; then
    echo "⚠️  WARNING: backend/.env file not found!"
    echo "   Please create it and add your GEMINI_API_KEY."
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
cd backend || exit

# Use uv for virtual environment (creates .venv folder)
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment with uv..."
    uv venv
fi

echo "📦 Installing dependencies with uv..."
uv pip install -r requirements.txt > /dev/null 2>&1

# Activate and run
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:8000"

# Start Frontend
echo "🚀 Starting Frontend (Next.js)..."
cd ../frontend || exit
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running on http://localhost:3000"

echo "========================================"
echo "   App is running! Press Ctrl+C to stop."
echo "========================================"

# Wait for processes
wait
