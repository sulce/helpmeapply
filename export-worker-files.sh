#!/bin/bash

# Script to export worker files to a new directory
# Usage: ./export-worker-files.sh /path/to/new-worker-repo

TARGET_DIR="${1:-../helpmeapply-worker}"

echo "🚀 Exporting worker files to: $TARGET_DIR"

# Create target directory
mkdir -p "$TARGET_DIR"

# Copy core worker files
echo "📦 Copying worker scripts..."
mkdir -p "$TARGET_DIR/src/scripts"
cp src/scripts/queue-worker.ts "$TARGET_DIR/src/scripts/"

# Copy queue system
echo "📦 Copying queue system..."
mkdir -p "$TARGET_DIR/src/lib/queue"
cp src/lib/queue/*.ts "$TARGET_DIR/src/lib/queue/"

# Copy job queue (alternative system)
echo "📦 Copying job queue system..."
mkdir -p "$TARGET_DIR/src/lib/jobQueue/handlers"
cp src/lib/jobQueue/*.ts "$TARGET_DIR/src/lib/jobQueue/" 2>/dev/null || true
cp src/lib/jobQueue/handlers/*.ts "$TARGET_DIR/src/lib/jobQueue/handlers/" 2>/dev/null || true

# Copy required library files
echo "📦 Copying library dependencies..."
cp src/lib/db.ts "$TARGET_DIR/src/lib/" 2>/dev/null || true
cp src/lib/openai.ts "$TARGET_DIR/src/lib/" 2>/dev/null || true
cp src/lib/jobScanner.ts "$TARGET_DIR/src/lib/" 2>/dev/null || true
cp src/lib/jobAPIs.ts "$TARGET_DIR/src/lib/" 2>/dev/null || true
cp src/lib/jobNotificationService.ts "$TARGET_DIR/src/lib/" 2>/dev/null || true

# Copy Prisma schema
echo "📦 Copying Prisma schema..."
mkdir -p "$TARGET_DIR/prisma"
cp prisma/schema.prisma "$TARGET_DIR/prisma/"

# Copy configuration files
echo "📦 Copying configuration..."
cp package.json "$TARGET_DIR/"
cp tsconfig.json "$TARGET_DIR/"
cp railway.json "$TARGET_DIR/"
cp Procfile "$TARGET_DIR/"
cp .gitignore "$TARGET_DIR/" 2>/dev/null || true

# Create minimal package.json for worker
echo "📦 Creating minimal package.json..."
cat > "$TARGET_DIR/package.json" << 'EOF'
{
  "name": "helpmeapply-worker",
  "version": "1.0.0",
  "description": "HelpMeApply Background Job Queue Worker",
  "main": "src/scripts/queue-worker.ts",
  "scripts": {
    "worker:run": "tsx src/scripts/queue-worker.ts",
    "worker:dev": "tsx watch src/scripts/queue-worker.ts",
    "build": "tsc",
    "db:generate": "prisma generate",
    "start": "npm run worker:run"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "@prisma/client": "^6.11.1",
    "@types/node": "^24.0.13",
    "openai": "^4.67.3",
    "prisma": "^6.11.1",
    "tsx": "^4.21.0",
    "typescript": "^5.8.3"
  },
  "keywords": ["job-queue", "worker", "background-jobs"],
  "author": "",
  "license": "ISC"
}
EOF

# Create .env.example
echo "📦 Creating .env.example..."
cat > "$TARGET_DIR/.env.example" << 'EOF'
# Database (MongoDB Atlas)
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/helpmeapply?retryWrites=true&w=majority"

# OpenAI (for job matching)
OPENAI_API_KEY="sk-..."

# Job Search API (RapidAPI - JSearch)
JSEARCH_API_KEY="your-rapidapi-key-here"

# Node Environment
NODE_ENV="production"

# Optional: File storage (if worker generates files)
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
EOF

# Create README
echo "📦 Creating README..."
cat > "$TARGET_DIR/README.md" << 'EOF'
# HelpMeApply Worker

Background job queue worker for processing job scans, AI analysis, and notifications.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
```

3. Generate Prisma client:
```bash
npm run db:generate
```

4. Run worker:
```bash
# Development
npm run worker:dev

# Production
npm run worker:run
```

## Deployment to Railway

1. Push this repo to GitHub
2. Create new Railway project
3. Connect GitHub repo
4. Add environment variables from `.env.example`
5. Configure:
   - Build Command: `npm ci && npx prisma generate`
   - Start Command: `npm run worker:run`
6. Deploy!

## Environment Variables

Required:
- `DATABASE_URL` - MongoDB connection string (must match main app)
- `OPENAI_API_KEY` - OpenAI API key for job analysis
- `JSEARCH_API_KEY` - RapidAPI key for job search

Optional:
- `CLOUDINARY_*` - For file storage

## Architecture

This worker connects to the same MongoDB database as the main Next.js app.

```
Main App (Vercel) → MongoDB ← Worker (Railway)
```

Jobs are created by the main app and processed by this worker.

## Monitoring

Check logs for health status:
```
💚 Queue healthy - P:5 R:2 C:120 F:0
```

Where:
- P = Pending jobs
- R = Running jobs
- C = Completed jobs
- F = Failed jobs
EOF

# Create .gitignore
echo "📦 Creating .gitignore..."
cat > "$TARGET_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Environment
.env
.env.local

# Prisma
prisma/migrations/

# Build
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF

echo ""
echo "✅ Worker files exported to: $TARGET_DIR"
echo ""
echo "📋 Next steps:"
echo "   1. cd $TARGET_DIR"
echo "   2. npm install"
echo "   3. cp .env.example .env (and fill in values)"
echo "   4. npm run db:generate"
echo "   5. npm run worker:dev (test locally)"
echo "   6. Push to GitHub and deploy to Railway"
echo ""
echo "🎉 Done!"
