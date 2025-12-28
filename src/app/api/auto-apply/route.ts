import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

interface AutoApplyRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  resume: File
  coverLetter?: string
  jobUrl: string
  jobTitle: string
  company: string
  platform: 'GREENHOUSE' | 'LEVER'
}

export async function POST(request: NextRequest) {
  let browser = null
  
  try {
    console.log('Auto-apply request received')
    
    // Parse form data
    const formData = await request.formData()
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const resume = formData.get('resume') as File
    const coverLetter = formData.get('coverLetter') as string
    const jobUrl = formData.get('jobUrl') as string
    const jobTitle = formData.get('jobTitle') as string
    const company = formData.get('company') as string
    const platform = formData.get('platform') as 'GREENHOUSE' | 'LEVER'

    // Validate required fields
    if (!firstName || !lastName || !email || !resume || !jobUrl || !platform) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    console.log(`Starting auto-apply for ${company} (${platform}) - ${jobTitle}`)

    // Save resume to temporary file
    const resumeBuffer = Buffer.from(await resume.arrayBuffer())
    const tempDir = path.join(process.cwd(), 'temp')
    const resumePath = path.join(tempDir, `resume_${Date.now()}.pdf`)

    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    await writeFile(resumePath, resumeBuffer)

    // Launch headless browser with stealth configuration
    console.log('Launching browser...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })

    const page = await browser.newPage()
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // Navigate to job application page
    console.log(`Navigating to: ${jobUrl}`)
    await page.goto(jobUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })

    // Take screenshot for debugging
    await page.screenshot({ 
      path: path.join(tempDir, `screenshot_${Date.now()}.png`),
      fullPage: true 
    })

    let fillResult
    if (platform === 'GREENHOUSE') {
      fillResult = await fillGreenhouseApplication(page, {
        firstName,
        lastName,
        email,
        phone,
        resumePath,
        coverLetter
      })
    } else if (platform === 'LEVER') {
      fillResult = await fillLeverApplication(page, {
        firstName,
        lastName,
        email,
        phone,
        resumePath,
        coverLetter
      })
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    if (fillResult.success) {
      console.log('Application submitted successfully')
      return NextResponse.json({
        success: true,
        message: `Application successfully submitted to ${company}`,
        details: fillResult.details
      })
    } else {
      console.log('Application failed:', fillResult.error)
      return NextResponse.json({
        success: false,
        error: fillResult.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Auto-apply error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  } finally {
    // Always close browser
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error('Error closing browser:', e)
      }
    }
  }
}

interface ApplicationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  resumePath: string
  coverLetter?: string
}

interface FillResult {
  success: boolean
  error?: string
  details?: string
}

/**
 * Fill out Greenhouse application form
 */
async function fillGreenhouseApplication(page: any, data: ApplicationData): Promise<FillResult> {
  try {
    console.log('Filling Greenhouse application form...')

    // Wait for the application form to load
    await page.waitForSelector('input, form', { timeout: 10000 })

    // Common Greenhouse selectors
    const selectors = {
      firstName: ['input[name="first_name"]', 'input[id*="first_name"]', 'input[placeholder*="First name"]'],
      lastName: ['input[name="last_name"]', 'input[id*="last_name"]', 'input[placeholder*="Last name"]'],
      email: ['input[name="email"]', 'input[type="email"]', 'input[id*="email"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]', 'input[id*="phone"]'],
      resume: ['input[type="file"]', 'input[name*="resume"]', 'input[accept*=".pdf"]'],
      coverLetter: ['textarea[name*="cover"]', 'textarea[id*="cover"]', 'textarea[placeholder*="cover"]'],
      submitButton: ['button[type="submit"]', 'input[type="submit"]', 'button:contains("Submit")', '[data-qa="submit-application"]']
    }

    // Fill out form fields
    await fillFieldBySelectors(page, selectors.firstName, data.firstName)
    await fillFieldBySelectors(page, selectors.lastName, data.lastName)
    await fillFieldBySelectors(page, selectors.email, data.email)
    await fillFieldBySelectors(page, selectors.phone, data.phone)

    // Upload resume
    const resumeUploaded = await uploadFileBySelectors(page, selectors.resume, data.resumePath)
    if (!resumeUploaded) {
      return { success: false, error: 'Could not upload resume file' }
    }

    // Fill cover letter if provided and field exists
    if (data.coverLetter) {
      await fillFieldBySelectors(page, selectors.coverLetter, data.coverLetter)
    }

    // Submit the application
    await page.waitForTimeout(2000) // Wait for any auto-validation
    
    const submitted = await submitBySelectors(page, selectors.submitButton)
    if (!submitted) {
      return { success: false, error: 'Could not find or click submit button' }
    }

    // Wait for submission confirmation
    await page.waitForTimeout(3000)
    
    // Check for success indicators
    const isSuccess = await page.evaluate(() => {
      const successIndicators = [
        'thank you',
        'application submitted',
        'successfully submitted',
        'application received',
        'confirmation'
      ]
      
      const pageText = document.body.innerText.toLowerCase()
      return successIndicators.some(indicator => pageText.includes(indicator))
    })

    if (isSuccess) {
      return { 
        success: true, 
        details: 'Application submitted via Greenhouse portal' 
      }
    } else {
      return { 
        success: false, 
        error: 'Form submitted but no confirmation found' 
      }
    }

  } catch (error) {
    console.error('Greenhouse application error:', error)
    return { 
      success: false, 
      error: `Greenhouse automation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Fill out Lever application form
 */
async function fillLeverApplication(page: any, data: ApplicationData): Promise<FillResult> {
  try {
    console.log('Filling Lever application form...')

    // Wait for the application form to load
    await page.waitForSelector('input, form', { timeout: 10000 })

    // Common Lever selectors
    const selectors = {
      firstName: ['input[name="name"]', 'input[placeholder*="First name"]', 'input[id*="first"]'],
      lastName: ['input[name="name"]', 'input[placeholder*="Last name"]', 'input[id*="last"]'], 
      fullName: ['input[name="name"]', 'input[placeholder*="Full name"]', 'input[placeholder*="Name"]'],
      email: ['input[name="email"]', 'input[type="email"]'],
      phone: ['input[name="phone"]', 'input[type="tel"]'],
      resume: ['input[type="file"]', 'input[accept*="pdf"]', '[data-qa="resume-upload"]'],
      coverLetter: ['textarea[name*="comments"]', 'textarea[placeholder*="cover"]', 'textarea[name="additional_information"]'],
      submitButton: ['button[type="submit"]', '[data-qa="submit-application"]', 'button:contains("Submit Application")']
    }

    // Lever often uses a single name field instead of separate first/last
    const hasFullNameField = await page.$(selectors.fullName[0])
    if (hasFullNameField) {
      await fillFieldBySelectors(page, selectors.fullName, `${data.firstName} ${data.lastName}`)
    } else {
      await fillFieldBySelectors(page, selectors.firstName, data.firstName)
      await fillFieldBySelectors(page, selectors.lastName, data.lastName)
    }

    await fillFieldBySelectors(page, selectors.email, data.email)
    await fillFieldBySelectors(page, selectors.phone, data.phone)

    // Upload resume
    const resumeUploaded = await uploadFileBySelectors(page, selectors.resume, data.resumePath)
    if (!resumeUploaded) {
      return { success: false, error: 'Could not upload resume file' }
    }

    // Fill cover letter/comments if provided
    if (data.coverLetter) {
      await fillFieldBySelectors(page, selectors.coverLetter, data.coverLetter)
    }

    // Submit the application
    await page.waitForTimeout(2000)
    
    const submitted = await submitBySelectors(page, selectors.submitButton)
    if (!submitted) {
      return { success: false, error: 'Could not find or click submit button' }
    }

    // Wait for submission confirmation
    await page.waitForTimeout(3000)
    
    // Check for success indicators
    const isSuccess = await page.evaluate(() => {
      const successIndicators = [
        'application sent',
        'thank you for your application',
        'successfully submitted',
        'application received',
        'we have received your application'
      ]
      
      const pageText = document.body.innerText.toLowerCase()
      return successIndicators.some(indicator => pageText.includes(indicator))
    })

    if (isSuccess) {
      return { 
        success: true, 
        details: 'Application submitted via Lever portal' 
      }
    } else {
      return { 
        success: false, 
        error: 'Form submitted but no confirmation found' 
      }
    }

  } catch (error) {
    console.error('Lever application error:', error)
    return { 
      success: false, 
      error: `Lever automation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Helper function to fill a field using multiple selector strategies
 */
async function fillFieldBySelectors(page: any, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.clear()
        await element.type(value, { delay: 50 })
        console.log(`Filled field with selector: ${selector}`)
        return true
      }
    } catch (error) {
      console.log(`Selector ${selector} failed:`, error)
      continue
    }
  }
  
  console.warn(`Could not fill field with any selectors: ${selectors.join(', ')}`)
  return false
}

/**
 * Helper function to upload a file using multiple selector strategies
 */
async function uploadFileBySelectors(page: any, selectors: string[], filePath: string): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.uploadFile(filePath)
        console.log(`Uploaded file with selector: ${selector}`)
        await page.waitForTimeout(2000) // Wait for upload to complete
        return true
      }
    } catch (error) {
      console.log(`Upload selector ${selector} failed:`, error)
      continue
    }
  }
  
  console.warn(`Could not upload file with any selectors: ${selectors.join(', ')}`)
  return false
}

/**
 * Helper function to submit form using multiple selector strategies
 */
async function submitBySelectors(page: any, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector)
      if (element) {
        await element.click()
        console.log(`Clicked submit with selector: ${selector}`)
        return true
      }
    } catch (error) {
      console.log(`Submit selector ${selector} failed:`, error)
      continue
    }
  }
  
  console.warn(`Could not submit with any selectors: ${selectors.join(', ')}`)
  return false
}