#!/bin/bash
# Script to seed the Render PostgreSQL database
# This script should be run as a one-time job on Render

set -e

echo "🌱 Starting database seeding..."

# Download Kaggle dataset
echo "📥 Downloading Kaggle dataset..."
pip install kaggle
export KAGGLE_USERNAME=your_username_here
export KAGGLE_KEY=your_key_here
kaggle datasets download -d olistbr/brazilian-ecommerce --unzip -p ./data/raw/

# Run seed script
echo "🚀 Seeding database..."
python -m data.seed

echo "✅ Database seeding complete!"
