# Railway Deployment Guide for HelpMeApply

This guide covers deploying the Next.js application AND the background queue worker to Railway.

## Architecture Overview

Your app has TWO components that need to run:
1. **Web Service** - Next.js application (main app)
2. **Worker Service** - Background job queue processor

Railway allows you to run multiple services in one project.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Railway CLI installed: `npm install -g @railway/cli` or use the web interface
3. MongoDB Atlas database URL
4. All required environment variables

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

#### Step 1: Create New Project
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account and select the HelpMeApply repository
4. Railway will auto-detect it as a Next.js project

#### Step 2: Deploy Web Service
1. Railway will create the first service automatically
2. Rename it to "web" for clarity
3. Add all environment variables (see below)
4. Deploy settings:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - Watch Paths: `src/**`

#### Step 3: Add Worker Service
1. In your Railway project, click "+ New Service"
2. Select "GitHub Repo" → Same repository
3. Rename this service to "worker"
4. Configure the worker:
   - Build Command: `npm ci && npm run build`
   - **Start Command: `npm run worker:run`**
   - Root Directory: `/` (same as web)
   - Watch Paths: `src/scripts/**, src/lib/queue/**, src/lib/jobQueue/**`
5. Add the SAME environment variables as the web service (worker needs DB access)

### Option 2: Deploy via Railway CLI

```bash
# 1. Login to Railway
railway login

# 2. Create new project
railway init

# 3. Link to your project
railway link

# 4. Add environment variables
railway variables set DATABASE_URL="your-mongodb-url"
railway variables set NEXTAUTH_SECRET="your-secret"
railway variables set NEXTAUTH_URL="https://your-app.railway.app"
# ... add all other env vars

# 5. Deploy web service
railway up

# 6. Add worker service
# (Do this via Railway Dashboard as CLI doesn't support multiple services easily)
```

## Required Environment Variables

Add these to BOTH services (web and worker):

### Core Configuration
```
DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-app.railway.app
NODE_ENV=production
```

### OAuth Providers
```
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
INDEED_CLIENT_ID=your-indeed-client-id
INDEED_CLIENT_SECRET=your-indeed-client-secret
```

### File Storage (Cloudinary Primary)
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### AWS S3 (Fallback)
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### APIs
```
OPENAI_API_KEY=sk-...
JSEARCH_API_KEY=your-rapidapi-key
```

### Stripe
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Service Configuration

### Web Service (Next.js App)
- **Port**: Railway auto-assigns (uses `$PORT` env var)
- **Health Check**: `/api/health` (create this if needed)
- **Restart Policy**: On failure
- **Region**: Choose closest to your users

### Worker Service (Background Jobs)
- **Port**: None (doesn't expose HTTP)
- **Health Check**: Logs only
- **Restart Policy**: On failure (will auto-restart if crashes)
- **Region**: Same as web service (reduces latency to shared DB)

## Post-Deployment Steps

### 1. Verify Web Service
```bash
curl https://your-app.railway.app/api/health
```

### 2. Check Worker Logs
In Railway Dashboard:
1. Go to worker service
2. Click "Logs" tab
3. Look for:
   - `✅ Queue Worker is running!`
   - `💚 Queue healthy - P:X R:Y C:Z F:W`

### 3. Test Queue System
From your app, trigger a job:
- Start a job scan from dashboard
- Check worker logs for processing
- Verify job completion in database

### 4. Setup Stripe Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.railway.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy webhook secret → Update `STRIPE_WEBHOOK_SECRET` env var
5. Redeploy web service

### 5. Database Migrations
```bash
# Run migrations on first deploy
railway run npx prisma migrate deploy

# Or via service settings, add to build command:
# npm run db:deploy && npm run build
```

## Monitoring & Debugging

### Check Service Health
```bash
# Web service
railway logs --service web

# Worker service
railway logs --service worker
```

### Common Issues

**Worker not processing jobs:**
- Check worker logs for startup errors
- Verify DATABASE_URL is set correctly
- Ensure MongoDB connection string allows Railway IP ranges (use 0.0.0.0/0 for testing)

**Database connection errors:**
- MongoDB Atlas: Whitelist Railway IPs (or allow all for testing)
- Check connection string format
- Verify database exists

**Build failures:**
- Check Node.js version (18+)
- Verify all dependencies in package.json
- Check for TypeScript errors: `npm run type-check`

**Stripe webhook failing:**
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint is publicly accessible
- Review logs for signature verification errors

## Scaling Considerations

### Current Setup (Database Queue)
- ✅ Good for: MVP, small-medium traffic
- ⚠️ Limitations: Database polling creates load
- 📈 Scale limit: ~100 jobs/minute

### Production Upgrade Path
When you need better performance:
1. Add Redis service in Railway
2. Update `src/lib/queue/QueueManager.ts`:
   ```typescript
   // Change this line:
   import { queue } from './DatabaseQueue'
   // To:
   import { queue } from './RedisQueue'
   ```
3. No other code changes needed!

### Worker Scaling
Railway allows horizontal scaling:
1. Go to worker service settings
2. Increase replica count (e.g., 2-5 workers)
3. Database queue includes row-level locking for safety

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month
  - 500 hours/month execution time
  - Good for: Development, testing
- **Pro Plan**: $20/month + usage
  - Unlimited hours
  - Better for: Production

Your setup uses:
- Web service: ~730 hours/month (always on)
- Worker service: ~730 hours/month (always on)
- **Total**: ~1460 hours/month → Need Pro plan for both services

## Maintenance

### Update Deployment
```bash
# Push to GitHub (if auto-deploy enabled)
git push origin main

# Or manual deploy
railway up
```

### View Metrics
Railway Dashboard → Service → Metrics tab shows:
- CPU usage
- Memory usage
- Network traffic
- Request count (web service only)

### Database Backups
Set up MongoDB Atlas automated backups:
1. Go to Atlas dashboard
2. Navigate to Backup tab
3. Enable continuous backups
4. Configure retention period

## Support

### Railway Issues
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Twitter: @Railway

### Application Issues
- Check application logs
- Review worker health checks
- Verify environment variables
- Test database connectivity

## Next Steps After Deployment

1. ✅ Configure custom domain (if needed)
2. ✅ Set up monitoring/alerting
3. ✅ Configure Stripe in production mode
4. ✅ Test complete user flow
5. ✅ Set up error tracking (e.g., Sentry)
6. ✅ Configure rate limiting for APIs
7. ✅ Review and optimize worker concurrency settings
