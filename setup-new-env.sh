#!/bin/bash

echo "🚀 Setting up Project Management System on new environment"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📦 Step 1: Installing Backend Dependencies..."
cd backend
npm install

echo ""
echo "🗄️ Step 2: Setting up Database Environment..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please create one with:"
    echo "DATABASE_URL=postgresql://username:password@localhost:5432/database_name"
    echo "JWT_SECRET=your_jwt_secret"
    echo "JWT_REFRESH_SECRET=your_refresh_secret"
    echo ""
    read -p "Press Enter when .env is ready, or Ctrl+C to exit..."
fi

echo ""
echo "🔧 Step 3: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🗃️ Step 4: Running Database Migrations..."
npx prisma migrate dev --name init

echo ""
echo "🌱 Step 5: Seeding Database (if seed exists)..."
if npm run seed 2>/dev/null; then
    echo "✅ Database seeded successfully"
else
    echo "ℹ️ No seed script found or failed - this is optional"
fi

echo ""
echo "📱 Step 6: Setting up Frontend..."
cd ../frontend
npm install

echo ""
echo "✅ Setup Complete!"
echo ""
echo "🚀 To start development:"
echo "Backend:  cd backend && npm run dev"
echo "Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 For network testing:"
echo "Backend:  cd backend && npm run dev"
echo "Frontend: cd frontend && npm run dev:network"
echo ""
echo "📖 Check docs/ folder for detailed guides"