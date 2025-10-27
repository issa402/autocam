# AutoCam - Automated Photo Sorting & Management

AutoCam is a SaaS application that saves photographers 90% of their time by automatically sorting photos into three categories: **BLURRY**, **CLEAN**, and **FINAL**. It uses AI-powered blur detection to identify quality issues and integrates with Google Photos for seamless export.

## 🎯 Features

- **AI-Powered Blur Detection**: Automatically identifies blurry photos using OpenCV
- **3-Set Workflow**: PENDING → BLURRY/CLEAN → FINAL
- **Photo Cropping**: Built-in crop tool with react-easy-crop
- **Google Photos Integration**: Direct export to Google Photos albums
- **Multi-User Support**: User authentication with JWT tokens
- **Batch Processing**: Process 4 photos in parallel for 2-3x speed improvement
- **Cloud-Ready**: Deploy to Vercel + Modal for production

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL (via Supabase)
- Redis (optional, for queue processing)

### Installation

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd ai-worker
pip install -r requirements.txt
cd ..

# Setup environment variables
cp .env.example .env
cp ai-worker/.env.example ai-worker/.env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### Running Locally

**Option 1: Using the startup script**
```bash
chmod +x start.sh
./start.sh
```

**Option 2: Manual startup**

Terminal 1 - Frontend:
```bash
npm run dev
# Runs on http://localhost:3000
```

Terminal 2 - AI Worker:
```bash
cd ai-worker
python3 main.py
# Runs on http://localhost:8001
```

Terminal 3 - Queue Processor (optional):
```bash
cd ai-worker
python3 worker.py
```

## 📁 Project Structure

```
autocam/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router pages
│   │   ├── api/                  # API routes
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Dashboard page
│   │   └── project/              # Project pages
│   ├── components/               # React components
│   ├── lib/                      # Utility functions
│   │   ├── google-photos.ts      # Google Photos API integration
│   │   ├── storage.ts            # Supabase Storage
│   │   ├── prisma.ts             # Database client
│   │   └── auth.ts               # Authentication utilities
│   ├── stores/                   # Zustand stores
│   │   ├── auth-store.ts         # Auth state
│   │   └── photo-store.ts        # Photo state
│   └── types/                    # TypeScript types
│
├── ai-worker/                    # Python AI service
│   ├── main.py                   # FastAPI server
│   ├── blur_detector.py          # Blur detection algorithm
│   ├── batch_processor.py        # Batch processing
│   ├── database.py               # Database operations
│   ├── deblur_engine.py          # Deblur functionality
│   ├── worker.py                 # Queue processor
│   └── requirements.txt          # Python dependencies
│
├── prisma/
│   └── schema.prisma             # Database schema
│
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
└── start.sh                      # Startup script
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=your_database_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**AI Worker (ai-worker/.env)**
```
DATABASE_URL=your_database_url
BLUR_THRESHOLD=150.0
MAX_IMAGE_SIZE=1280
ENABLE_FACE_DETECTION=false
```

## 📊 Performance

- **Processing Speed**: 2-3 seconds per photo
- **Batch Processing**: 4 photos in parallel
- **500 Photos**: 7-12 minutes total
- **Memory**: ~500 MB per photo
- **CPU**: Uses local CPU (or cloud CPU when deployed)

## 🚢 Deployment

### Frontend (Vercel)
```bash
# Push to GitHub
git push origin main

# Deploy to Vercel
# Connect your GitHub repo at vercel.com
```

### AI Worker (Modal)
```bash
# Install Modal CLI
pip install modal

# Deploy
modal deploy ai-worker/main.py
```

### Full Stack Cost
- Vercel: $20/month
- Modal: $50/month
- Supabase: $50/month
- **Total: $120/month** (unlimited users)

## 🔐 Security

- JWT token authentication (15-minute expiration)
- bcrypt password hashing
- Row-level security (RLS) on Supabase
- Google OAuth 2.0 integration
- CORS protection
- Environment variable management

## 📚 Key Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), Node.js
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **AI/ML**: OpenCV, NumPy
- **Authentication**: JWT, bcrypt, Google OAuth
- **State Management**: Zustand
- **UI Components**: Radix UI

## 🐛 Troubleshooting

### AI Worker not responding
```bash
# Check if service is running
curl http://localhost:8001/health

# Restart AI Worker
pkill -f "python3 main.py"
cd ai-worker && python3 main.py
```

### Database connection errors
```bash
# Check Supabase connection
npx prisma db push

# View database
npx prisma studio
```

### Photos not uploading
- Check Supabase Storage bucket permissions
- Verify Google OAuth credentials
- Check browser console for errors

## 📖 Documentation

- **API Routes**: See `src/app/api/` for endpoint documentation
- **Components**: See `src/components/` for component usage
- **Database Schema**: See `prisma/schema.prisma`

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## 📝 License

MIT License - See LICENSE file for details

## 🎯 Next Steps

- [ ] Deploy frontend to Vercel
- [ ] Deploy AI worker to Modal
- [ ] Set up production Google OAuth
- [ ] Configure custom domain
- [ ] Set up monitoring and logging
- [ ] Create user documentation

---

**Questions?** Check the troubleshooting section or review the code comments for detailed explanations.

