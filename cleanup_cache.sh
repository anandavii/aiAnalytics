#!/bin/bash

# Cleanup Cache Script
# Removes Python __pycache__, Next.js .next, debug logs, and node_modules

echo "========================================"
echo "   Project Cache Cleanup"
echo "========================================"

PROJECT_DIR="$(dirname "$0")"
cd "$PROJECT_DIR" || exit 1

# Track what was cleaned
CLEANED=""

# 1. Remove Python __pycache__ directories
echo "🐍 Cleaning Python __pycache__..."
PYCACHE_COUNT=$(find . -type d -name "__pycache__" 2>/dev/null | wc -l | tr -d ' ')
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
if [ "$PYCACHE_COUNT" -gt 0 ]; then
    echo "   ✅ Removed $PYCACHE_COUNT __pycache__ folder(s)"
    CLEANED="$CLEANED pycache"
else
    echo "   ℹ️  No __pycache__ folders found"
fi

# 2. Remove .pyc files
echo "🐍 Cleaning .pyc files..."
PYC_COUNT=$(find . -type f -name "*.pyc" 2>/dev/null | wc -l | tr -d ' ')
find . -type f -name "*.pyc" -delete 2>/dev/null
if [ "$PYC_COUNT" -gt 0 ]; then
    echo "   ✅ Removed $PYC_COUNT .pyc file(s)"
    CLEANED="$CLEANED pyc"
else
    echo "   ℹ️  No .pyc files found"
fi

# 3. Remove Next.js .next cache
echo "⚛️  Cleaning Next.js .next cache..."
if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next
    echo "   ✅ Removed frontend/.next"
    CLEANED="$CLEANED next"
else
    echo "   ℹ️  No .next folder found"
fi

# 4. Remove node_modules
echo "📦 Cleaning node_modules..."
if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    echo "   ✅ Removed frontend/node_modules"
    CLEANED="$CLEANED node_modules"
else
    echo "   ℹ️  No node_modules folder found"
fi

# 5. Remove debug logs
echo "📝 Cleaning debug logs..."
if [ -f "backend/llm_debug.log" ]; then
    rm backend/llm_debug.log
    echo "   ✅ Removed backend/llm_debug.log"
    CLEANED="$CLEANED logs"
else
    echo "   ℹ️  No debug logs found"
fi

# 6. Remove .DS_Store files (macOS)
echo "🍎 Cleaning .DS_Store files..."
DS_COUNT=$(find . -type f -name ".DS_Store" 2>/dev/null | wc -l | tr -d ' ')
find . -type f -name ".DS_Store" -delete 2>/dev/null
if [ "$DS_COUNT" -gt 0 ]; then
    echo "   ✅ Removed $DS_COUNT .DS_Store file(s)"
    CLEANED="$CLEANED dsstore"
else
    echo "   ℹ️  No .DS_Store files found"
fi

echo ""
echo "========================================"
if [ -n "$CLEANED" ]; then
    echo "   ✅ Cleanup complete!"
    echo ""
    echo "📦 To reinstall dependencies, run:"
    echo "   ./start_app.sh"
    echo ""
    echo "   Or manually:"
    echo "   cd frontend && npm install"
else
    echo "   ℹ️  Nothing to clean - project is already clean!"
fi
echo "========================================"
