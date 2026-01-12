# Deploy Worker to Railway (Next.js stays on Vercel)

Since your Next.js app is already on Vercel, you only need to deploy the **background worker** to Railway.

## Architecture

- **Vercel**: Next.js application (web interface, API routes)
- **Railway**: Background queue worker (job processing)
- **MongoDB Atlas**: Shared database (accessed by both)

Both services connect to the same MongoDB database to coordinate jobs.

## Quick Start

### Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your HelpMeApply repository
4. Railway will detect it as Next.js, but we'll configure it for worker only

### Step 2: Configure as Worker

1. Once deployed, go to **Service Settings**
2. Update these settings:
   - **Service Name**: `helpmeapply-worker`
   - **Build Command**: `npm ci && npx prisma generate`
   - **Start Command**: `npm run worker:run`
   - **Watch Paths**: `src/scripts/**, src/lib/queue/**, src/lib/jobQueue/**`

### Step 3: Add Environment Variables

Add ONLY these essential variables (worker doesn't need OAuth, Stripe, etc.):

```bash
# Database (REQUIRED - must match Vercel)
DATABASE_URL=mongodb+srv://...

# OpenAI (for job processing)
OPENAI_API_KEY=sk-...

# Job Search API
JSEARCH_API_KEY=your-rapidapi-key

# Node environment
NODE_ENV=production

# Optional: File storage (if worker generates files)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Important**: Use the SAME `DATABASE_URL` as your Vercel deployment!

### Step 4: Deploy

Click "Deploy" and Railway will:
1. Install dependencies
2. Generate Prisma client
3. Start the worker with `npm run worker:run`

## Verify Deployment

### Check Worker Logs
In Railway Dashboard → Logs tab, you should see:
```
🚀 Starting Queue Worker...
✅ Queue Worker is running!
🔄 Processing jobs in background...
💚 Queue healthy - P:0 R:0 C:0 F:0
```

### Test from Vercel App
1. Go to your Vercel-hosted app
2. Trigger a job scan from the dashboard
3. Check Railway worker logs
4. Job should be picked up and processed

## Configuration Files Needed

You already have these files created (for worker-only deployment):

### `Procfile` (Not used by Railway, but good to have)
```
worker: npm run worker:run
```

### `railway.json` (Configure worker)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npx prisma generate"
  },
  "deploy": {
    "startCommand": "npm run worker:run",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Environment Variables Reference

### On Railway (Worker)
Only needs job processing variables:
- `DATABASE_URL` ← Must match Vercel
- `OPENAI_API_KEY`
- `JSEARCH_API_KEY`
- `CLOUDINARY_*` (optional)
- `NODE_ENV=production`

### On Vercel (Web App)
Keeps all the web-specific variables:
- `DATABASE_URL` ← Same as Railway
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `STRIPE_*`
- OAuth providers
- Everything else

## MongoDB Atlas Configuration

Since both services connect to MongoDB, you need to:

1. Go to MongoDB Atlas → Network Access
2. Add Railway's IP ranges OR allow all (0.0.0.0/0)
3. Your connection string should include:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/helpmeapply?retryWrites=true&w=majority
   ```

## How It Works Together

1. **User action on Vercel app** → Creates job in database
2. **Railway worker polls database** → Picks up pending jobs
3. **Worker processes job** → Updates database with results
4. **Vercel app reads results** → Shows to user

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Vercel    │────────▶│   MongoDB    │◀────────│   Railway   │
│  (Next.js)  │         │    Atlas     │         │  (Worker)   │
└─────────────┘         └──────────────┘         └─────────────┘
     │                         ▲                        │
     │                         │                        │
     └─────── Write Jobs ──────┘                        │
                               └────── Read Jobs ───────┘
```

## Monitoring

### Railway Dashboard
- **Logs**: Real-time worker activity
- **Metrics**: CPU, memory, network usage
- **Deployments**: History and rollback

### Health Checks
The worker logs health status every minute:
```
💚 Queue healthy - P:5 R:2 C:120 F:0
```
- P = Pending jobs
- R = Running jobs
- C = Completed jobs
- F = Failed jobs

### Create Health Check Endpoint (Optional)
Add to your Vercel app at `/api/queue/health`:

```typescript
// src/app/api/queue/health/route.ts
import { prisma } from '@/lib/db'

export async function GET() {
  const stats = await prisma.jobQueue.groupBy({
    by: ['status'],
    _count: true
  })

  return Response.json({
    healthy: true,
    queue: stats
  })
}
```

## Common Issues

### Worker not processing jobs

**Check 1**: Worker is running
```bash
railway logs
# Should show: ✅ Queue Worker is running!
```

**Check 2**: Database connection
```bash
railway logs | grep "Database"
# Should show successful connection
```

**Check 3**: Jobs exist in database
From Vercel app, check if jobs are being created

**Check 4**: Same DATABASE_URL
Verify Railway and Vercel have identical database URLs

### Build failures

**Missing Prisma client**:
```bash
# Update build command to include:
npm ci && npx prisma generate
```

**TypeScript errors**:
```bash
# Locally test:
npm run type-check
```

## Scaling

### Current Setup
- 1 worker instance
- Processes ~5-10 jobs concurrently
- Good for MVP / moderate traffic

### When to Scale Up

**Add more replicas when:**
- Jobs are backing up (many pending)
- Processing time is slow
- You have high traffic

**How to scale:**
1. Railway Dashboard → Settings
2. Increase replica count (e.g., 2-3 workers)
3. Database queue handles multiple workers safely

### Upgrade to Redis (Future)

When you need better performance:
1. Add Redis to Railway project
2. Update `QueueManager.ts` import
3. Much faster job processing

## Cost

Railway pricing:
- **Hobby**: $5/month (500 hours)
  - Your 1 worker = ~730 hours/month
  - ❌ Not enough
- **Pro**: $20/month base + usage
  - ✅ Unlimited hours
  - ✅ Better for production

Recommendation: Start with Pro plan ($20/month)

## Deployment Commands

### Deploy/Redeploy
```bash
# Option 1: Push to GitHub (auto-deploys if configured)
git push origin main

# Option 2: Railway CLI
railway up

# Option 3: Railway Dashboard
Click "Deploy" button
```

### View Logs
```bash
railway logs --follow
```

### Run Commands on Railway
```bash
# Generate Prisma client
railway run npx prisma generate

# Run migrations
railway run npx prisma migrate deploy
```

## Next Steps

1. ✅ Deploy worker to Railway
2. ✅ Verify logs show successful startup
3. ✅ Test job processing from Vercel app
4. ✅ Monitor for 24 hours
5. ✅ Set up alerts (optional)
6. ✅ Consider Redis upgrade if needed

## Quick Reference

### Railway Service Settings
```
Service Name: helpmeapply-worker
Build Command: npm ci && npx prisma generate
Start Command: npm run worker:run
Root Directory: /
```

### Required ENV Variables
```
DATABASE_URL=mongodb+srv://...
OPENAI_API_KEY=sk-...
JSEARCH_API_KEY=...
NODE_ENV=production
```

### Useful Links
- Railway Dashboard: https://railway.app/dashboard
- Worker Logs: https://railway.app/project/[id]/service/[id]
- Docs: https://docs.railway.app

## Troubleshooting Checklist

- [ ] Worker shows "✅ Queue Worker is running!" in logs
- [ ] DATABASE_URL matches Vercel exactly
- [ ] MongoDB Atlas allows Railway IPs
- [ ] Jobs appear in database when created from Vercel
- [ ] Worker picks up and processes jobs
- [ ] No errors in Railway logs
- [ ] Vercel app shows job results

Need help? Check Railway logs first, then MongoDB connection, then job queue status.
