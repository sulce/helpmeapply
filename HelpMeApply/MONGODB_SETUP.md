# MongoDB Atlas Setup Guide for HelpMeApply

## Overview
This guide walks you through setting up MongoDB Atlas (free tier) for your HelpMeApply application.

## Step 1: Create MongoDB Atlas Account

1. **Sign up**: Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database) 
2. **Choose Free Tier**: Select "M0 Sandbox" (512 MB storage, free forever)
3. **Choose Cloud Provider**: AWS, Google Cloud, or Azure (pick closest region)
4. **Cluster Name**: Use "HelpMeApply" or keep default

## Step 2: Database User Setup

1. **Create Database User**:
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Authentication: Username/Password
   - Username: `helpmeapply_user` 
   - Password: Generate strong password (save it!)
   - Database User Privileges: "Read and write to any database"

## Step 3: Network Access

1. **Whitelist IP Addresses**:
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - For development: "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific deployment IPs

## Step 4: Get Connection String

1. **Connect to Database**:
   - Go to "Database" (Clusters)
   - Click "Connect" on your cluster
   - Choose "Drivers"
   - Select "Node.js" and latest version
   - Copy the connection string

2. **Connection String Format**:
   ```
   mongodb+srv://helpmeapply_user:<password>@cluster0.xxxxx.mongodb.net/helpmeapply?retryWrites=true&w=majority
   ```

## Step 5: Update Environment Variables

Update your `.env` file:

```bash
# Database (MongoDB Atlas)
DATABASE_URL="mongodb+srv://helpmeapply_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/helpmeapply?retryWrites=true&w=majority"
```

**Important**: 
- Replace `YOUR_PASSWORD` with your actual database user password
- Replace `cluster0.xxxxx` with your actual cluster URL
- Replace `helpmeapply` with your preferred database name

## Step 6: Initialize Database

Since MongoDB is schemaless, you don't need migrations, but you should initialize Prisma:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to MongoDB (creates collections)
npx prisma db push
```

## Step 7: Test Connection

Test your connection:

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Try to register a new user to test database connection
```

## Production Deployment

### Environment Variables for Production:

```bash
# MongoDB Atlas (same for all environments)
DATABASE_URL="mongodb+srv://helpmeapply_user:PRODUCTION_PASSWORD@cluster0.xxxxx.mongodb.net/helpmeapply_prod?retryWrites=true&w=majority"
```

### Vercel Deployment:
```bash
vercel env add DATABASE_URL production
```

### Render Deployment:
Add `DATABASE_URL` in Render dashboard environment variables.

## MongoDB Atlas Features

### Free Tier Includes:
- ✅ 512 MB storage
- ✅ Shared RAM and vCPU
- ✅ No time limit
- ✅ Basic monitoring
- ✅ Community support

### Monitoring:
- **Performance Advisor**: Query optimization suggestions
- **Real-time Performance Panel**: Monitor operations
- **Profiler**: Analyze slow operations

## Best Practices

### Security:
1. **Strong Passwords**: Use generated passwords
2. **Network Access**: Restrict IP addresses in production
3. **Database Users**: Create specific users with minimal permissions
4. **Connection String**: Never commit to version control

### Performance:
1. **Indexes**: MongoDB Atlas auto-creates indexes for common queries
2. **Connection Pooling**: Prisma handles this automatically
3. **Data Modeling**: Design for your query patterns

### Backup:
- **Free Tier**: Basic cloud backup included
- **Paid Tiers**: Point-in-time recovery available

## Common Issues & Solutions

### Connection Issues:
```bash
# Error: Authentication failed
# Solution: Check username/password in connection string

# Error: IP not whitelisted  
# Solution: Add your IP to Network Access

# Error: Database not found
# Solution: Database is created automatically when first document is inserted
```

### Development Issues:
```bash
# Error: Prisma client generation failed
# Solution: Run `npx prisma generate`

# Error: Schema sync issues
# Solution: Run `npx prisma db push`
```

## Scaling Considerations

### When to Upgrade:
- Storage > 500 MB
- Need dedicated resources
- Require advanced monitoring
- Need automated backups

### Migration Path:
- M2/M5 shared clusters ($9-25/month)
- M10+ dedicated clusters ($57+/month)
- Easy one-click scaling in Atlas dashboard

## MongoDB vs SQL Differences

### Data Modeling:
- **Flexible Schema**: No rigid table structure
- **Embedded Documents**: Store related data together  
- **Arrays**: Native support for lists
- **JSON-like**: Perfect for web applications

### Prisma Integration:
- **No Migrations**: Schema changes are immediate
- **Type Safety**: Full TypeScript support
- **Relations**: Handled via references
- **Queries**: Same Prisma syntax

## Support Resources

- **MongoDB University**: Free courses
- **Atlas Documentation**: Comprehensive guides
- **Community Forums**: Active community support
- **Stack Overflow**: Tagged `mongodb-atlas`

---

## Quick Setup Commands

```bash
# 1. Update schema
npx prisma generate

# 2. Sync with MongoDB
npx prisma db push

# 3. Test connection
npm run dev

# 4. Deploy to production
vercel --prod
# or
git push origin main  # for Render
```

Your MongoDB Atlas database is now ready for HelpMeApply! 🚀

## Next Steps
1. Complete environment variable setup
2. Deploy to Vercel/Render  
3. Test user registration
4. Monitor database usage in Atlas dashboard