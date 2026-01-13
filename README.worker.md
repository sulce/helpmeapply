# HelpMeApply Worker

**This is the worker branch** - contains only the background queue worker code.

## Branch Structure

- `main` branch → Full Next.js app (deployed to Vercel)
- `worker` branch → Worker only (deployed to Railway) ← **You are here**

## What's in This Branch

- Worker entry point: `src/scripts/queue-worker.ts`
- Queue system: `src/lib/queue/` and `src/lib/jobQueue/`
- Support libraries: `src/lib/db.ts`, `src/lib/openai.ts`, etc.
- Database schema: `prisma/schema.prisma`
- **Only 7 dependencies** (no Next.js, React, Puppeteer)

## Deploy to Railway

1. Go to railway.app
2. Create new project from GitHub
3. Select this repository
4. **Important:** Select `worker` branch (not main!)
5. Configure:
   - Build Command: `npm ci && npx prisma generate`
   - Start Command: `npm run start`
6. Add environment variables:
   ```
   DATABASE_URL=mongodb+srv://...
   OPENAI_API_KEY=sk-...
   JSEARCH_API_KEY=...
   NODE_ENV=production
   ```
7. Deploy!

## Expected Build Time

- Install dependencies: ~30 seconds
- Generate Prisma client: ~10 seconds
- **Total: ~1 minute** 🚀

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run worker
npm run worker:dev
```

## Updating Worker Code

When you make changes to worker code in `main` branch:

```bash
# Get the commit hash from main
git log main -1

# Switch to worker branch
git checkout worker

# Cherry-pick the change
git cherry-pick <commit-hash>

# Push to trigger Railway redeploy
git push origin worker
```

## Environment Variables

Same as main app, but worker only needs:
- `DATABASE_URL` (required)
- `OPENAI_API_KEY` (required)
- `JSEARCH_API_KEY` (required)
- `NODE_ENV` (optional)

Does NOT need:
- NextAuth variables
- Stripe variables
- OAuth provider keys
- Cloudinary/AWS (unless worker uploads files)
