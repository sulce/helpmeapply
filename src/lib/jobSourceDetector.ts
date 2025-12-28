/**
 * Enhanced job source detection utility
 * Categorizes job URLs into specific platforms for targeted automation
 */

export type JobSource = 'INDEED' | 'GREENHOUSE' | 'LEVER' | 'OTHER'

export interface JobSourceInfo {
  source: JobSource
  canAutomate: boolean
  automationType: 'direct' | 'on_site_form' | 'puppeteer' | 'manual'
  displayName: string
  icon: string
  badge: {
    color: string
    text: string
  }
}

/**
 * Detects job source from URL using regex patterns
 */
export function detectJobSource(url: string): JobSource {
  if (!url) return 'OTHER'
  
  const normalizedUrl = url.toLowerCase()
  
  // Indeed detection (existing)
  if (normalizedUrl.includes('indeed.com')) {
    return 'INDEED'
  }
  
  // Greenhouse detection
  if (normalizedUrl.match(/boards\.greenhouse\.io|job-boards\.greenhouse\.io/)) {
    return 'GREENHOUSE'
  }
  
  // Lever detection
  if (normalizedUrl.includes('jobs.lever.co')) {
    return 'LEVER'
  }
  
  // Everything else
  return 'OTHER'
}

/**
 * Gets comprehensive information about a job source
 */
export function getJobSourceInfo(url: string): JobSourceInfo {
  const source = detectJobSource(url)
  
  switch (source) {
    case 'INDEED':
      return {
        source: 'INDEED',
        canAutomate: true,
        automationType: 'direct',
        displayName: 'Indeed',
        icon: '🤖',
        badge: {
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          text: 'Auto Apply Available'
        }
      }
      
    case 'GREENHOUSE':
      return {
        source: 'GREENHOUSE',
        canAutomate: true,
        automationType: 'on_site_form',
        displayName: 'Greenhouse',
        icon: '🏢',
        badge: {
          color: 'bg-green-50 text-green-700 border-green-200',
          text: 'Smart Apply Available'
        }
      }
      
    case 'LEVER':
      return {
        source: 'LEVER',
        canAutomate: true,
        automationType: 'on_site_form',
        displayName: 'Lever',
        icon: '⚡',
        badge: {
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          text: 'Smart Apply Available'
        }
      }
      
    case 'OTHER':
    default:
      return {
        source: 'OTHER',
        canAutomate: false,
        automationType: 'manual',
        displayName: 'External',
        icon: '📝',
        badge: {
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          text: 'Manual Apply Required'
        }
      }
  }
}

/**
 * Enhanced job normalization for the new detection system
 */
export function normalizeJobWithSource(job: any): any {
  const sourceInfo = getJobSourceInfo(job.job_apply_link || job.url)
  
  return {
    ...job,
    source: sourceInfo.source.toLowerCase(),
    sourceInfo: sourceInfo,
    canAutoApply: sourceInfo.canAutomate,
    automationType: sourceInfo.automationType
  }
}

/**
 * Utility to check if a job supports on-site application forms
 */
export function supportsOnSiteForm(url: string): boolean {
  const source = detectJobSource(url)
  return source === 'GREENHOUSE' || source === 'LEVER'
}

/**
 * Utility to check if a job supports direct automation
 */
export function supportsDirectAutomation(url: string): boolean {
  const source = detectJobSource(url)
  return source === 'INDEED'
}