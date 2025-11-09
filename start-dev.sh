#!/bin/bash

# Start both frontend and backend development servers
echo "Starting FastAPI + React development environment..."

# Start backend server in background
cd backend
echo "Starting FastAPI server on http://localhost:8000"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend server in background
cd ../frontend
echo "Starting React server on http://localhost:3000"
npm start &
FRONTEND_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to catch Ctrl+C
trap cleanup INT

# Wait for both processes
wait