# Job Portal Setup Script for Windows

Write-Host "Setting up Job Portal Monorepo..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "OK - Node.js version: $nodeVersion" -ForegroundColor Green

    $majorVersion = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "ERROR - Node.js version 18 or higher is required. Current: $nodeVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR - Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm -v
    Write-Host "OK - npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR - npm is not installed." -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR - Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

# -- BACKEND ------------------------------------------------------------------

if (-not (Test-Path "backend/package.json")) {
    Write-Host "ERROR - backend folder not found or missing package.json" -ForegroundColor Red
    exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR - Failed to install backend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Copy backend environment file
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "Created backend .env from .env.example" -ForegroundColor Green
        Write-Host "NOTE - Please update backend/.env with your actual configuration" -ForegroundColor Yellow
    } else {
        Write-Host "NOTE - backend/.env.example not found. Create backend/.env manually." -ForegroundColor Yellow
    }
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR - Prisma client generation failed. Make sure schema.prisma exists." -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "OK - Prisma client generated successfully" -ForegroundColor Green

Set-Location ..

# -- FRONTEND -----------------------------------------------------------------

if (-not (Test-Path "frontend/package.json")) {
    Write-Host "ERROR - frontend folder not found or missing package.json" -ForegroundColor Red
    exit 1
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR - Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Copy frontend environment file
if (-not (Test-Path .env.local)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env.local
        Write-Host "Created frontend .env.local from .env.example" -ForegroundColor Green
        Write-Host "NOTE - Please update frontend/.env.local with your actual configuration" -ForegroundColor Yellow
    } else {
        Write-Host "NOTE - frontend/.env.example not found. Create frontend/.env.local manually." -ForegroundColor Yellow
    }
}

Set-Location ..

# -- DONE ---------------------------------------------------------------------

Write-Host ""
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update backend/.env with your actual configuration"
Write-Host "  2. Update frontend/.env.local with your actual configuration"
Write-Host "  3. Make sure PostgreSQL is running on localhost:5432"
Write-Host "  4. Run: cd backend"
Write-Host "     Then: npx prisma migrate dev --name init"
Write-Host "  5. Run: npx prisma db seed"
Write-Host "  6. Go back to root and run: npm run dev"
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "  Frontend      : http://localhost:3000"
Write-Host "  Backend API   : http://localhost:5000"
Write-Host "  API Docs      : http://localhost:5000/api/docs"
Write-Host "  Prisma Studio : cd backend then npx prisma studio (port 5555)"
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  npm run dev           - Start both frontend and backend"
Write-Host "  npm run dev:backend   - Start only backend"
Write-Host "  npm run dev:frontend  - Start only frontend"
Write-Host "  npm run build         - Build both for production"
Write-Host "  npm run start         - Start both in production mode"