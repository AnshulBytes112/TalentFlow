# Job Portal Setup Script for Windows

Write-Host "🚀 Setting up Job Portal Monorepo..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
    
    # Check Node.js version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "❌ Node.js version 18 or higher is required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm -v
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed." -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

# Copy backend environment file
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "📝 Created backend .env file from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Please update the .env file with your actual configuration" -ForegroundColor Yellow
}

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

# Copy frontend environment file
if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
    Write-Host "📝 Created frontend .env.local file from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Please update the .env.local file with your actual configuration" -ForegroundColor Yellow
}

# Go back to root
Set-Location ..

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update backend/.env with your actual configuration"
Write-Host "2. Update frontend/.env.local with your actual configuration"
Write-Host "3. Make sure MongoDB is running on localhost:270270"
Write-Host "4. Run 'npm run dev' to start both frontend and backend"
Write-Host ""
Write-Host "🌐 Access points:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000"
Write-Host "- Backend API: http://localhost:5000"
Write-Host "- API Documentation: http://localhost:5000/api-docs"
Write-Host ""
Write-Host "📚 Useful commands:" -ForegroundColor Cyan
Write-Host "- npm run dev          - Start both frontend and backend"
Write-Host "- npm run dev:backend  - Start only backend"
Write-Host "- npm run dev:frontend - Start only frontend"
Write-Host "- npm run build        - Build both for production"
Write-Host "- npm run start        - Start both in production mode"

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
