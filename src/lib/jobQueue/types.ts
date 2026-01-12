export interface JobData {
  id: string
  type: JobType
  payload: any
  priority: number
  attempts: number
  maxAttempts: number
  scheduledFor?: Date
  createdAt: Date
  updatedAt: Date
}

export enum JobType {
  USER_JOB_SCAN = 'user_job_scan',
  AUTOMATED_JOB_SCAN = 'automated_job_scan',
  PROCESS_JOB_MATCHES = 'process_job_matches',
  ANALYZE_JOB_MATCH = 'analyze_job_match',
  CLEANUP_EXPIRED_REVIEWS = 'cleanup_expired_reviews',
  CLEANUP_EXPIRED_NOTIFICATIONS = 'cleanup_expired_notifications',
  SEND_DAILY_SUMMARY = 'send_daily_summary',
  GENERATE_COVER_LETTER = 'generate_cover_letter',
  CUSTOMIZE_RESUME = 'customize_resume',
  PROCESS_APPLICATION = 'process_application',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  SCHEDULED = 'SCHEDULED',
}

export interface JobResult {
  success: boolean
  data?: any
  error?: string
  duration?: number
  nextRetryAt?: Date
}

export interface QueueMetrics {
  pending: number
  processing: number
  completed: number
  failed: number
  retrying: number
  scheduled: number
}

export interface JobHandler {
  type: JobType
  handler: (payload: any) => Promise<JobResult>
  concurrency?: number
  retryDelay?: number
  timeout?: number
}

export interface ScheduledJob {
  type: JobType
  cronExpression: string
  payload?: any
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
}