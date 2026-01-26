#!/bin/bash

# Reset Backend Virtual Environment
# Removes .venv completely - requires reinstall afterward

echo "========================================"
echo "   Reset Backend Virtual Environment"
echo "========================================"

cd "$(dirname "$0")/backend" || exit 1

if [ -d ".venv" ]; then
    echo "🗑️  Removing .venv folder..."
    rm -rf .venv
    echo "✅ Virtual environment removed!"
    echo ""
    echo "📦 To reinstall, run:"
    echo "   cd backend && uv venv && uv pip install -r requirements.txt"
    echo ""
    echo "   Or simply run: ./start_app.sh"
else
    echo "ℹ️  No .venv folder found - nothing to remove."
fi

echo "========================================"
