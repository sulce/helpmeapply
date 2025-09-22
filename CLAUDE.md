# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HelpMeApply AI is a production-grade AI-powered job application assistant that automates the job search and application process for job seekers. The MVP focuses on user management, profile creation, and AI-powered job matching.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with LinkedIn/Indeed OAuth
- **File Storage**: AWS S3 for resume uploads
- **AI**: OpenAI API for job matching and application assistance

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
/
├── src/
│   ├── app/                 # Next.js 14 app router
│   │   ├── (auth)/         # Auth-related routes
│   │   ├── dashboard/      # User dashboard
│   │   ├── profile/        # Profile management
│   │   └── api/            # API routes
│   ├── components/         # Reusable React components
│   │   ├── ui/            # Base UI components
│   │   ├── auth/          # Authentication components
│   │   └── profile/       # Profile-related components
│   ├── lib/               # Utility functions and configurations
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── db.ts          # Database connection
│   │   └── validations.ts # Zod schemas
│   └── types/             # TypeScript type definitions
├── prisma/                # Database schema and migrations
├── public/               # Static assets
└── uploads/              # Local file uploads (dev only)
```

## Key Features Implementation

### Authentication System
- Manual registration/login with email verification
- LinkedIn OAuth integration
- Indeed OAuth integration
- Session management with NextAuth.js

### Profile Management
- Comprehensive user profiles with:
  - Personal information (name, email, mobile)
  - Job preferences (title, locations, employment type)
  - Skills with proficiency levels
  - Experience and salary expectations
  - Resume/CV upload functionality
  - LinkedIn/Indeed profile import

### Database Schema
- Users table with authentication data
- Profiles table with detailed user information
- Skills table with proficiency tracking
- Jobs table for storing opportunities
- Applications table for tracking submissions

## Environment Variables

Required environment variables:
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
INDEED_CLIENT_ID=...
INDEED_CLIENT_SECRET=...
OPENAI_API_KEY=...
JSEARCH_API_KEY=...                # RapidAPI key for JSearch (job search API)

# File Upload Services (Priority: Cloudinary first, S3 fallback)
# Cloudinary (Primary - recommended)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# AWS S3 (Fallback)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=us-east-1              # Optional, defaults to us-east-1
```

### Job Search APIs

The application uses a resilient job search system with multiple data sources:

**Primary API: JSearch (RapidAPI)**
- Aggregates jobs from LinkedIn, Indeed, Glassdoor, and 15+ other job boards
- Requires RapidAPI subscription and JSearch API key
- Rate limited to 60 requests per minute
- Provides comprehensive job data including salaries, requirements, and benefits

**Backup System**
- Automatically falls back to mock data when primary API fails
- Ensures application continues to function during API outages
- Can be extended with additional job sources

**API Endpoints:**
- `POST /api/jobs/search` - Search for jobs with filters
- `POST /api/jobs/details` - Get detailed job information
- `POST /api/jobs/scan` - Start automated job scanning
- `GET /api/jobs/scan` - Check job queue status
- `GET /api/jobs` - List saved jobs with pagination

## Development Guidelines

- Use TypeScript for all new code
- Follow Next.js 14 app router conventions
- Use Prisma for all database operations
- Implement proper error handling and validation
- Use Tailwind CSS for styling with consistent design system
- Follow security best practices for file uploads and authentication
- Use React Query for API state management
- Implement proper loading states and error boundaries