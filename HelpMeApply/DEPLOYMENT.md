# HelpMeApply Production Deployment Guide

## Overview
This guide covers deploying HelpMeApply to production using:
- **Frontend**: Vercel 
- **Backend**: Render (or same Vercel deployment)
- **Database**: MongoDB Atlas (Free Tier)

## Pre-Deployment Checklist

### 1. Environment Variables Setup
Copy `.env.production` and update with your actual production values:

#### Critical Variables:
```bash
# Database (MongoDB Atlas connection string)
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/helpmeapply?retryWrites=true&w=majority"

# NextAuth (Generate strong secret)
NEXTAUTH_SECRET="your-production-secret-here"
NEXTAUTH_URL="https://your-domain.vercel.app"

# API Keys
OPENAI_API_KEY="your-openai-key"
JSEARCH_API_KEY="your-rapidapi-jsearch-key"

# OAuth (Production credentials)
LINKEDIN_CLIENT_ID="production-linkedin-id"
LINKEDIN_CLIENT_SECRET="production-linkedin-secret"

# File Storage
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"
```

### 2. Database Setup
1. **Create MongoDB Atlas cluster** (FREE - follow `MONGODB_SETUP.md`)
2. **Get connection string** from Atlas dashboard
3. **Update `DATABASE_URL`** in your environment
4. **Initialize database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### 3. Build Test
Ensure production build works locally:
```bash
npm run build
```

## Deployment Steps

### Option 1: Vercel Deployment (Recommended)

#### Step 1: Initial Setup
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`

#### Step 2: Environment Variables
Add all environment variables in Vercel dashboard:
```bash
vercel env add NEXTAUTH_SECRET
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
# ... add all variables from .env.production
```

#### Step 3: Deploy
```bash
vercel --prod
```

### Option 2: Render Deployment

#### Step 1: Create Render Services  
1. **MongoDB Atlas Database**:
   - Use your existing MongoDB Atlas cluster
   - No additional database service needed

2. **Web Service**:
   - Connect your GitHub repo
   - Use `render.yaml` configuration
   - Add all environment variables

#### Step 2: Environment Configuration
In Render dashboard, add:
- All variables from `.env.production`
- Set `NEXTAUTH_URL` to your Render URL  
- Use your MongoDB Atlas `DATABASE_URL` (same as development)

### Step 3: Deploy
- Push to your main branch
- Render will auto-deploy using `render.yaml`

## Post-Deployment

### 1. Database Initialization
Initialize database schema in production:
```bash
# If using Vercel
vercel exec "npx prisma db push"

# If using Render (via dashboard terminal)  
npx prisma db push
```

### 2. Verification Checklist
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] Login/logout functions
- [ ] Profile creation works
- [ ] File upload (resume) works
- [ ] Job search API responds
- [ ] AI features respond correctly
- [ ] Database connections stable

### 3. OAuth Setup
Update OAuth applications with production URLs:

**LinkedIn Developer Console**:
- Redirect URIs: `https://yourdomain.vercel.app/api/auth/callback/linkedin`

**Indeed Developer Portal**:  
- Redirect URIs: `https://yourdomain.vercel.app/api/auth/callback/indeed`

## Monitoring & Maintenance

### Health Checks
Monitor these endpoints:
- `GET /api/health` - Application health
- `GET /api/auth/session` - Authentication status
- `POST /api/jobs/search` - Core functionality

### Performance Optimization
- Enable Vercel Analytics
- Monitor database query performance
- Set up error tracking (Sentry recommended)
- Configure CDN for file uploads

### Backup Strategy
- **Database**: MongoDB Atlas automated backups (basic on free tier)
- **Files**: Cloudinary has built-in redundancy
- **Code**: GitHub repository

## Troubleshooting

### Common Issues:

**Build Failures:**
- Check TypeScript errors
- Verify all environment variables
- Ensure database is accessible

**Database Connection Issues:**
- Verify MongoDB Atlas connection string format
- Check network access whitelist in Atlas
- Ensure database user has proper permissions

**OAuth Failures:**
- Verify redirect URLs match exactly
- Check client IDs/secrets
- Ensure HTTPS in production

**File Upload Issues:**
- Verify Cloudinary credentials
- Check file size limits
- Confirm CORS settings

## Security Considerations

### Production Security:
- [ ] Strong NEXTAUTH_SECRET generated
- [ ] Database credentials secured
- [ ] API keys rotated regularly
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured
- [ ] Rate limiting implemented

### Environment Variables:
- Never commit production .env files
- Use separate staging environment
- Rotate secrets regularly
- Monitor for exposed keys

## Scaling Considerations

As your application grows:

1. **Database**: Upgrade MongoDB Atlas tier for more storage/performance
2. **File Storage**: Implement CDN caching
3. **API**: Add rate limiting and caching
4. **Monitoring**: Set up comprehensive logging + MongoDB Atlas monitoring
5. **Background Jobs**: Consider separate worker processes

## Support

For deployment issues:
1. Check application logs
2. Verify environment configuration  
3. Test database connectivity
4. Validate API endpoints
5. Review security settings

---

## Quick Start Commands

```bash
# Clone and setup
git clone <your-repo>
cd helpmeapply
npm install

# Environment setup
cp .env.production .env.local
# Edit .env.local with your values

# Database setup (MongoDB Atlas)
npx prisma generate
npx prisma db push

# Build and test
npm run build
npm start

# Deploy to Vercel
vercel --prod

# Deploy to Render
git push origin main
```

Your HelpMeApply application should now be live and ready for users! 🚀