#!/bin/bash
# Quick setup script for ml-service

echo "🚀 Setting up ML Inference Service..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create test image
echo "🖼️  Creating test image..."
python3 -c "from PIL import Image; Image.new('RGB', (800, 600), color='red').save('test_image.jpg')"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run tests: pytest tests/ -v"
echo "2. Start server: uvicorn app.main:app --reload"
echo "3. View API docs: http://localhost:8000/docs"
echo "4. Test endpoint: curl -X POST http://localhost:8000/predict -F 'file=@test_image.jpg'"
