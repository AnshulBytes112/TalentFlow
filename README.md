# Job Application Portal

A comprehensive job application portal built as a monorepo with Next.js 14 frontend and Node.js + Express backend.

## 🚀 Features

- **Role-based Authentication** (Job Seeker, Recruiter, Admin)
- **Job Management** - Post, edit, and manage job listings
- **Application Tracking** - Submit and track job applications
- **Real-time Notifications** - Live updates with Socket.io
- **File Uploads** - Resume uploads with Cloudinary integration
- **Email Notifications** - Automated email alerts
- **Analytics Dashboard** - Comprehensive analytics and reporting
- **Kanban Board** - Drag-and-drop application pipeline management
- **Responsive Design** - Mobile-first approach with Tailwind CSS

## 📁 Project Structure

```
/job-portal
  /frontend          → Next.js 14 (App Router)
    /app             → App Router pages and layouts
    /components      → Reusable UI components
    /lib             → Utility functions and configurations
    /hooks           → Custom React hooks
    /types           → TypeScript type definitions
  /backend           → Node.js + Express API
    /config          → Database and service configurations
    /controllers     → Route controllers
    /middleware      → Express middleware
    /models          → MongoDB/Mongoose models
    /routes          → API routes
    /services        → Business logic services
    /utils           → Utility functions
```

## 🛠 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **NextAuth.js** (Authentication)
- **React Query** (Data fetching)
- **Socket.io Client** (Real-time communication)
- **Recharts** (Charts and analytics)
- **DnD Kit** (Drag and drop)
- **Lucide React** (Icons)
- **React Hot Toast** (Notifications)

### Backend
- **Node.js + Express**
- **TypeScript**
- **MongoDB + Mongoose**
- **JWT Authentication**
- **Socket.io** (Real-time communication)
- **Cloudinary** (File uploads)
- **Nodemailer** (Email services)
- **Swagger** (API documentation)
- **Helmet** (Security)
- **Morgan** (Logging)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/job-portal.git
cd job-portal
```

### 2. Install Dependencies

#### Windows Users
```powershell
# Run the setup script
.\setup.ps1

# Or manually:
npm run install:all
```

#### Mac/Linux Users
```bash
# Run the setup script
chmod +x setup.sh
./setup.sh

# Or manually:
npm run install:all
```

### 3. Environment Setup

The setup script creates environment files automatically. You'll need to configure:

**Backend (.env)**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/job-portal

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# API
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Start Development Servers
```bash
npm run dev
```

This starts both frontend (http://localhost:3000) and backend (http://localhost:5000) concurrently.

## 📜 Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start both frontend and backend in production mode
- `npm run install:all` - Install dependencies for all packages
- `npm run clean` - Clean all node_modules directories
- `npm run dev:frontend` - Start only frontend development server
- `npm run dev:backend` - Start only backend development server

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet.js security headers
- Environment variable protection
- Secure file uploads with Cloudinary

## 📊 API Documentation

Once the backend is running, visit http://localhost:5000/api-docs for interactive API documentation (Swagger).

## 🧪 Testing

```bash
# Run tests for frontend
cd frontend && npm test

# Run tests for backend
cd backend && npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Frontend (Vercel recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Heroku/Railway/Render)
1. Connect your GitHub repository
2. Configure environment variables
3. Set up MongoDB Atlas for production database
4. Deploy and configure custom domain if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **API Documentation**: http://localhost:5000/api-docs
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 📈 Project Status

- ✅ Basic Authentication
- ✅ Job Management
- ✅ Application Tracking
- ✅ Real-time Notifications
- ✅ File Uploads
- ✅ Email Integration
- ✅ Analytics Dashboard
- 🚀 Mobile App (Planned)
- 🚀 AI Job Matching (Planned)
- 🚀 Video Interviews (Planned)

---

**Note**: This project is actively being developed. Features and documentation are updated regularly.
