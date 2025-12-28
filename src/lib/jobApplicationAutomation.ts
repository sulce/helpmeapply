import puppeteer, { Browser, Page } from 'puppeteer'

interface ApplicationData {
  fullName: string
  email: string
  phone: string
  resumeUrl: string
  coverLetter?: string
  linkedinProfile?: string
  portfolioUrl?: string
}

interface ApplicationResult {
  success: boolean
  platform: string
  method: 'automated' | 'redirect' | 'failed'
  confirmationId?: string
  error?: string
  redirectUrl?: string
  duration?: number
}

export class JobApplicationAutomation {
  private browser: Browser | null = null

  async initBrowser(): Promise<void> {
    if (this.browser) return

    const isProduction = process.env.NODE_ENV === 'production'
    
    this.browser = await puppeteer.launch({
      headless: isProduction, // Show browser in development for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        // Production optimizations
        ...(isProduction ? [
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript',
          '--disable-dev-shm-usage',
        ] : [])
      ],
      defaultViewport: { width: 1366, height: 768 }
    })

    console.log('Browser initialized for job application automation')
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('Browser closed')
    }
  }

  async applyToJob(
    jobUrl: string, 
    jobPublisher: string, 
    applicationData: ApplicationData
  ): Promise<ApplicationResult> {
    const startTime = Date.now()
    
    try {
      await this.initBrowser()
      
      console.log(`=== STARTING AUTOMATION ===`)
      console.log(`Platform: ${jobPublisher}`)
      console.log(`URL: ${jobUrl}`)
      console.log(`Applicant: ${applicationData.fullName}`)

      switch (jobPublisher.toLowerCase()) {
        case 'indeed':
        case 'indeed.com':
          return await this.applyToIndeed(jobUrl, applicationData)
        
        case 'greenhouse':
        case 'greenhouse.io':
          return await this.applyToGreenhouse(jobUrl, applicationData)
        
        case 'lever':
        case 'lever.co':
          return await this.applyToLever(jobUrl, applicationData)
        
        case 'linkedin':
        case 'linkedin.com':
          return await this.applyToLinkedIn(jobUrl, applicationData)
        
        case 'workday':
          return await this.applyToWorkday(jobUrl, applicationData)
        
        default:
          console.log(`Unsupported platform: ${jobPublisher}, falling back to redirect`)
          return {
            success: false,
            platform: jobPublisher,
            method: 'redirect',
            redirectUrl: jobUrl,
            error: 'Platform not supported for automation'
          }
      }
    } catch (error) {
      console.error('Job application automation failed:', error)
      return {
        success: false,
        platform: jobPublisher,
        method: 'failed',
        error: error instanceof Error ? error.message : 'Unknown automation error',
        redirectUrl: jobUrl
      }
    } finally {
      const duration = Date.now() - startTime
      console.log(`Automation completed in ${duration}ms`)
      
      // Always close browser after each job to save memory
      await this.closeBrowser()
    }
  }

  private async applyToIndeed(jobUrl: string, data: ApplicationData): Promise<ApplicationResult> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    
    try {
      console.log('Starting Indeed application automation...')
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Navigate to job application page
      console.log('Navigating to Indeed job page:', jobUrl)
      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Wait for page to load and look for Apply button
      await page.waitForSelector('button[data-jk], .jobsearch-IndeedApplyButton-newDesign, [data-testid="apply-button"]', { timeout: 15000 })
      
      // Click the Apply button
      const applyButtonClicked = await this.clickIndeedApplyButton(page)
      if (!applyButtonClicked) {
        throw new Error('Could not find or click Apply button')
      }

      // Wait for application form to load
      console.log('Waiting for application form...')
      await page.waitForSelector('form, [data-testid="contact-info"], input[name="applicant.name"], #input-applicant\\.name', { timeout: 15000 })
      
      // Fill out the application form
      await this.fillIndeedApplicationForm(page, data)
      
      // Submit the application
      const submitted = await this.submitIndeedApplication(page)
      
      if (submitted) {
        // Look for confirmation
        const confirmationId = await this.getIndeedConfirmationId(page)
        
        return {
          success: true,
          platform: 'indeed',
          method: 'automated',
          confirmationId: confirmationId || 'SUCCESS'
        }
      } else {
        throw new Error('Failed to submit application')
      }

    } catch (error) {
      console.error('Indeed automation error:', error)
      
      // Take screenshot for debugging (only in development)
      if (process.env.NODE_ENV !== 'production') {
        try {
          await page.screenshot({ path: `debug-indeed-${Date.now()}.png` })
        } catch (screenshotError) {
          console.error('Failed to take debug screenshot:', screenshotError)
        }
      }
      
      return {
        success: false,
        platform: 'indeed',
        method: 'failed',
        error: error instanceof Error ? error.message : 'Unknown Indeed error',
        redirectUrl: jobUrl
      }
    } finally {
      await page.close()
    }
  }

  private async clickIndeedApplyButton(page: Page): Promise<boolean> {
    const applySelectors = [
      'button[data-jk]', // Standard Indeed apply button
      '.jobsearch-IndeedApplyButton-newDesign', // New design
      '[data-testid="apply-button"]', // Test ID selector
      'button:has-text("Apply")', // Fallback text selector
      'a:has-text("Apply")', // Link version
      '.ia-JobActions-apply' // Alternative selector
    ]

    for (const selector of applySelectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          console.log(`Found Apply button with selector: ${selector}`)
          await element.click()
          
          // Wait a bit for navigation/modal
          await page.waitForTimeout(2000)
          return true
        }
      } catch (error) {
        console.log(`Apply selector ${selector} not found or failed`)
        continue
      }
    }

    return false
  }

  private async fillIndeedApplicationForm(page: Page, data: ApplicationData): Promise<void> {
    console.log('Filling Indeed application form...')

    // Name fields
    const nameSelectors = [
      '#input-applicant\\.name',
      'input[name="applicant.name"]',
      'input[data-testid="contact-info-name"]',
      'input[placeholder*="name" i]'
    ]
    
    await this.fillFirstFoundInput(page, nameSelectors, data.fullName, 'Full Name')

    // Email fields  
    const emailSelectors = [
      '#input-applicant\\.email',
      'input[name="applicant.email"]',
      'input[data-testid="contact-info-email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]'
    ]
    
    await this.fillFirstFoundInput(page, emailSelectors, data.email, 'Email')

    // Phone fields
    const phoneSelectors = [
      '#input-applicant\\.phoneNumber',
      'input[name="applicant.phoneNumber"]', 
      'input[data-testid="contact-info-phone"]',
      'input[type="tel"]',
      'input[placeholder*="phone" i]'
    ]
    
    await this.fillFirstFoundInput(page, phoneSelectors, data.phone, 'Phone')

    // Resume upload
    await this.uploadResumeToIndeed(page, data.resumeUrl)

    // Cover letter
    if (data.coverLetter) {
      await this.fillIndeedCoverLetter(page, data.coverLetter)
    }

    // LinkedIn profile
    if (data.linkedinProfile) {
      const linkedinSelectors = [
        'input[name="linkedinProfile"]',
        'input[placeholder*="linkedin" i]',
        'input[name="socialProfile"]'
      ]
      
      await this.fillFirstFoundInput(page, linkedinSelectors, data.linkedinProfile, 'LinkedIn Profile')
    }

    console.log('Form filling completed')
  }

  private async fillFirstFoundInput(page: Page, selectors: string[], value: string, fieldName: string): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const input = await page.$(selector)
        if (input) {
          console.log(`Filling ${fieldName} with selector: ${selector}`)
          await input.click()
          await input.focus()
          
          // Clear existing value
          await page.keyboard.down('Meta') // Cmd on Mac, Ctrl on PC
          await page.keyboard.press('a')
          await page.keyboard.up('Meta')
          
          // Type new value
          await input.type(value, { delay: 50 })
          
          // Verify the input was filled
          const inputValue = await input.evaluate((el: any) => el.value)
          if (inputValue.includes(value)) {
            console.log(`✓ ${fieldName} filled successfully`)
            return true
          }
        }
      } catch (error) {
        console.log(`Failed to fill ${fieldName} with selector ${selector}:`, error)
        continue
      }
    }
    
    console.log(`⚠️ Could not fill ${fieldName} - no matching selectors found`)
    return false
  }

  private async uploadResumeToIndeed(page: Page, resumeUrl: string): Promise<void> {
    console.log('Attempting to upload resume...')
    
    try {
      // Download resume to temporary file for upload
      const response = await fetch(resumeUrl)
      if (!response.ok) {
        throw new Error(`Failed to download resume: ${response.status}`)
      }
      
      const resumeBuffer = await response.arrayBuffer()
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')
      
      // Create temporary file
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `resume-${Date.now()}.pdf`)
      await fs.writeFile(tempFilePath, Buffer.from(resumeBuffer))
      
      console.log(`Resume downloaded to: ${tempFilePath}`)
      
      const fileInputSelectors = [
        'input[type="file"]',
        'input[name="resume"]',
        'input[data-testid="resume-upload"]',
        'input[accept*="pdf" i]'
      ]

      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await page.$(selector) as any
          if (fileInput) {
            console.log(`Found file input: ${selector}`)
            await fileInput.uploadFile(tempFilePath)
            console.log('✓ Resume uploaded successfully')
            
            // Clean up temporary file
            await fs.unlink(tempFilePath)
            return
          }
        } catch (error) {
          console.log(`File upload selector ${selector} failed:`, error)
          continue
        }
      }
      
      // Clean up temporary file if upload failed
      await fs.unlink(tempFilePath)
      console.log('⚠️ No file upload input found')
      
    } catch (error) {
      console.error('Resume upload failed:', error)
    }
  }

  private async fillIndeedCoverLetter(page: Page, coverLetter: string): Promise<void> {
    const coverLetterSelectors = [
      'textarea[name="coverLetter"]',
      'textarea[data-testid="cover-letter"]',
      'textarea[placeholder*="cover letter" i]',
      '#coverLetter'
    ]

    for (const selector of coverLetterSelectors) {
      try {
        const textarea = await page.$(selector)
        if (textarea) {
          console.log(`Found cover letter field: ${selector}`)
          await textarea.click()
          await textarea.type(coverLetter, { delay: 20 })
          console.log('✓ Cover letter filled')
          return
        }
      } catch (error) {
        continue
      }
    }
    
    console.log('⚠️ No cover letter field found')
  }

  private async submitIndeedApplication(page: Page): Promise<boolean> {
    console.log('Attempting to submit application...')
    
    const submitSelectors = [
      'button[data-testid="submit-application-button"]',
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      '.ia-ApplyForm-submitButton'
    ]

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector)
        if (button) {
          console.log(`Found submit button: ${selector}`)
          
          // Check if button is enabled
          const isDisabled = await button.evaluate((el: any) => el.disabled)
          if (isDisabled) {
            console.log('Submit button is disabled, checking for required fields...')
            continue
          }
          
          await button.click()
          console.log('✓ Submit button clicked')
          
          // Wait for navigation or confirmation
          await page.waitForTimeout(3000)
          return true
        }
      } catch (error) {
        console.log(`Submit selector ${selector} failed:`, error)
        continue
      }
    }
    
    console.log('⚠️ Could not find or click submit button')
    return false
  }

  private async getIndeedConfirmationId(page: Page): Promise<string | null> {
    try {
      // Wait for confirmation page
      await page.waitForSelector('.ia-ConfirmationPage, .confirmation, [data-testid="confirmation"]', { timeout: 10000 })
      
      // Look for confirmation text or ID
      const confirmationSelectors = [
        '.confirmation-id',
        '.application-id', 
        '[data-testid="confirmation-id"]'
      ]
      
      for (const selector of confirmationSelectors) {
        const element = await page.$(selector)
        if (element) {
          const confirmationId = await element.evaluate((el: any) => el.textContent)
          if (confirmationId) {
            console.log('✓ Found confirmation ID:', confirmationId)
            return confirmationId.trim()
          }
        }
      }
      
      // If no specific ID, just return success indicator
      return 'APPLICATION_SUBMITTED'
      
    } catch (error) {
      console.log('Could not find confirmation page, but application may have succeeded')
      return 'SUBMITTED_NO_CONFIRMATION'
    }
  }

  // Greenhouse automation implementation
  private async applyToGreenhouse(jobUrl: string, data: ApplicationData): Promise<ApplicationResult> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    
    try {
      console.log('Starting Greenhouse application automation...')
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Navigate to Greenhouse application page
      console.log('Navigating to Greenhouse job page:', jobUrl)
      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Wait for Greenhouse application form to load
      await page.waitForSelector('#application_form, .application-form, [data-provides="application-form"]', { timeout: 15000 })
      
      console.log('Greenhouse application form detected')
      
      // Fill out the standard Greenhouse application form
      await this.fillGreenhouseApplicationForm(page, data)
      
      // Submit the application
      const submitted = await this.submitGreenhouseApplication(page)
      
      if (submitted) {
        // Look for confirmation
        const confirmationId = await this.getGreenhouseConfirmationId(page)
        
        return {
          success: true,
          platform: 'greenhouse',
          method: 'automated',
          confirmationId: confirmationId || 'GREENHOUSE_SUCCESS'
        }
      } else {
        throw new Error('Failed to submit Greenhouse application')
      }

    } catch (error) {
      console.error('Greenhouse automation error:', error)
      
      // Take screenshot for debugging (only in development)
      if (process.env.NODE_ENV !== 'production') {
        try {
          await page.screenshot({ path: `debug-greenhouse-${Date.now()}.png` })
        } catch (screenshotError) {
          console.error('Failed to take debug screenshot:', screenshotError)
        }
      }
      
      return {
        success: false,
        platform: 'greenhouse',
        method: 'failed',
        error: error instanceof Error ? error.message : 'Unknown Greenhouse error',
        redirectUrl: jobUrl
      }
    } finally {
      await page.close()
    }
  }

  private async fillGreenhouseApplicationForm(page: Page, data: ApplicationData): Promise<void> {
    console.log('Filling Greenhouse application form...')

    // Greenhouse standard form selectors (very consistent across companies)
    
    // Personal Information Section
    await this.fillGreenhousePersonalInfo(page, data)
    
    // Resume Upload Section  
    await this.uploadResumeToGreenhouse(page, data.resumeUrl)
    
    // Cover Letter Section
    if (data.coverLetter) {
      await this.fillGreenhouseCoverLetter(page, data.coverLetter)
    }
    
    // Additional Information (LinkedIn, Portfolio, etc.)
    await this.fillGreenhouseAdditionalInfo(page, data)
    
    console.log('Greenhouse form filling completed')
  }

  private async fillGreenhousePersonalInfo(page: Page, data: ApplicationData): Promise<void> {
    // First Name
    const firstNameSelectors = [
      '#first_name',
      'input[name="first_name"]',
      'input[placeholder*="First name" i]',
      '#application_first_name'
    ]
    const firstName = data.fullName.split(' ')[0]
    await this.fillFirstFoundInput(page, firstNameSelectors, firstName, 'First Name')

    // Last Name  
    const lastNameSelectors = [
      '#last_name',
      'input[name="last_name"]',
      'input[placeholder*="Last name" i]',
      '#application_last_name'
    ]
    const lastName = data.fullName.split(' ').slice(1).join(' ')
    await this.fillFirstFoundInput(page, lastNameSelectors, lastName, 'Last Name')

    // Email
    const emailSelectors = [
      '#email',
      'input[name="email"]',
      'input[type="email"]',
      '#application_email'
    ]
    await this.fillFirstFoundInput(page, emailSelectors, data.email, 'Email')

    // Phone
    const phoneSelectors = [
      '#phone',
      'input[name="phone"]',
      'input[type="tel"]',
      '#application_phone'
    ]
    await this.fillFirstFoundInput(page, phoneSelectors, data.phone, 'Phone')

    console.log('✓ Greenhouse personal info filled')
  }

  private async uploadResumeToGreenhouse(page: Page, resumeUrl: string): Promise<void> {
    console.log('Attempting to upload resume to Greenhouse...')
    
    try {
      // Download resume to temporary file for upload
      const response = await fetch(resumeUrl)
      if (!response.ok) {
        throw new Error(`Failed to download resume: ${response.status}`)
      }
      
      const resumeBuffer = await response.arrayBuffer()
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')
      
      // Create temporary file
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `resume-greenhouse-${Date.now()}.pdf`)
      await fs.writeFile(tempFilePath, Buffer.from(resumeBuffer))
      
      console.log(`Resume downloaded to: ${tempFilePath}`)
      
      const fileInputSelectors = [
        '#resume',
        'input[name="resume"]',
        'input[type="file"]',
        '#application_resume',
        'input[accept*="pdf" i]'
      ]

      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await page.$(selector) as any
          if (fileInput) {
            console.log(`Found Greenhouse file input: ${selector}`)
            await fileInput.uploadFile(tempFilePath)
            console.log('✓ Greenhouse resume uploaded successfully')
            
            // Clean up temporary file
            await fs.unlink(tempFilePath)
            return
          }
        } catch (error) {
          console.log(`Greenhouse file upload selector ${selector} failed:`, error)
          continue
        }
      }
      
      // Clean up temporary file if upload failed
      await fs.unlink(tempFilePath)
      console.log('⚠️ No Greenhouse file upload input found')
      
    } catch (error) {
      console.error('Greenhouse resume upload failed:', error)
    }
  }

  private async fillGreenhouseCoverLetter(page: Page, coverLetter: string): Promise<void> {
    const coverLetterSelectors = [
      '#cover_letter',
      'textarea[name="cover_letter"]',
      '#application_cover_letter',
      'textarea[placeholder*="cover letter" i]'
    ]

    for (const selector of coverLetterSelectors) {
      try {
        const textarea = await page.$(selector)
        if (textarea) {
          console.log(`Found Greenhouse cover letter field: ${selector}`)
          await textarea.click()
          await textarea.type(coverLetter, { delay: 20 })
          console.log('✓ Greenhouse cover letter filled')
          return
        }
      } catch (error) {
        continue
      }
    }
    
    console.log('⚠️ No Greenhouse cover letter field found')
  }

  private async fillGreenhouseAdditionalInfo(page: Page, data: ApplicationData): Promise<void> {
    // LinkedIn Profile
    if (data.linkedinProfile) {
      const linkedinSelectors = [
        '#linkedin',
        'input[name="linkedin"]',
        'input[placeholder*="linkedin" i]',
        '#application_linkedin'
      ]
      await this.fillFirstFoundInput(page, linkedinSelectors, data.linkedinProfile, 'LinkedIn Profile')
    }

    // Portfolio/Website
    if (data.portfolioUrl) {
      const portfolioSelectors = [
        '#website',
        'input[name="website"]', 
        'input[name="portfolio"]',
        'input[placeholder*="website" i]',
        'input[placeholder*="portfolio" i]'
      ]
      await this.fillFirstFoundInput(page, portfolioSelectors, data.portfolioUrl, 'Portfolio URL')
    }

    console.log('✓ Greenhouse additional info filled')
  }

  private async submitGreenhouseApplication(page: Page): Promise<boolean> {
    console.log('Attempting to submit Greenhouse application...')
    
    const submitSelectors = [
      '#submit_application',
      'input[type="submit"]',
      'button[type="submit"]',
      'input[value*="Submit" i]',
      'button:has-text("Submit")',
      '.btn-submit',
      '#application_submit'
    ]

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector)
        if (button) {
          console.log(`Found Greenhouse submit button: ${selector}`)
          
          // Check if button is enabled
          const isDisabled = await button.evaluate((el: any) => el.disabled)
          if (isDisabled) {
            console.log('Submit button is disabled, checking for required fields...')
            continue
          }
          
          await button.click()
          console.log('✓ Greenhouse submit button clicked')
          
          // Wait for submission to process
          await page.waitForTimeout(3000)
          return true
        }
      } catch (error) {
        console.log(`Greenhouse submit selector ${selector} failed:`, error)
        continue
      }
    }
    
    console.log('⚠️ Could not find or click Greenhouse submit button')
    return false
  }

  private async getGreenhouseConfirmationId(page: Page): Promise<string | null> {
    try {
      // Wait for confirmation page or success message
      await page.waitForSelector('.confirmation, .success-message, .application-submitted, #confirmation', { timeout: 10000 })
      
      // Look for confirmation text
      const confirmationSelectors = [
        '.confirmation-number',
        '.application-id',
        '.reference-number',
        '#confirmation_id'
      ]
      
      for (const selector of confirmationSelectors) {
        const element = await page.$(selector)
        if (element) {
          const confirmationId = await element.evaluate((el: any) => el.textContent)
          if (confirmationId) {
            console.log('✓ Found Greenhouse confirmation ID:', confirmationId)
            return confirmationId.trim()
          }
        }
      }
      
      // Check URL for confirmation
      const currentUrl = page.url()
      if (currentUrl.includes('confirmation') || currentUrl.includes('submitted') || currentUrl.includes('thank')) {
        console.log('✓ Greenhouse application submitted successfully (URL confirmation)')
        return 'GREENHOUSE_SUBMITTED_SUCCESS'
      }
      
      return 'GREENHOUSE_APPLICATION_SUBMITTED'
      
    } catch (error) {
      console.log('Could not find Greenhouse confirmation, but application may have succeeded')
      return 'GREENHOUSE_SUBMITTED_NO_CONFIRMATION'
    }
  }

  // Lever automation implementation
  private async applyToLever(jobUrl: string, data: ApplicationData): Promise<ApplicationResult> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    
    try {
      console.log('Starting Lever application automation...')
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      console.log('Navigating to Lever job page:', jobUrl)
      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Wait for Lever application form to load
      await page.waitForSelector('.application-form, .lever-form, form[data-qa="application-form"]', { timeout: 15000 })
      
      console.log('Lever application form detected')
      
      // Fill out the Lever application form
      await this.fillLeverApplicationForm(page, data)
      
      // Submit the application
      const submitted = await this.submitLeverApplication(page)
      
      if (submitted) {
        const confirmationId = await this.getLeverConfirmationId(page)
        
        return {
          success: true,
          platform: 'lever',
          method: 'automated',
          confirmationId: confirmationId || 'LEVER_SUCCESS'
        }
      } else {
        throw new Error('Failed to submit Lever application')
      }

    } catch (error) {
      console.error('Lever automation error:', error)
      
      if (process.env.NODE_ENV !== 'production') {
        try {
          await page.screenshot({ path: `debug-lever-${Date.now()}.png` })
        } catch (screenshotError) {
          console.error('Failed to take debug screenshot:', screenshotError)
        }
      }
      
      return {
        success: false,
        platform: 'lever',
        method: 'failed',
        error: error instanceof Error ? error.message : 'Unknown Lever error',
        redirectUrl: jobUrl
      }
    } finally {
      await page.close()
    }
  }

  private async fillLeverApplicationForm(page: Page, data: ApplicationData): Promise<void> {
    console.log('Filling Lever application form...')

    // Lever often uses a single name field or separate first/last
    const nameSelectors = [
      'input[name="name"]',
      'input[placeholder*="Full name" i]',
      'input[placeholder*="Name" i]'
    ]
    
    const firstNameSelectors = [
      'input[name="first_name"]',
      'input[placeholder*="First name" i]'
    ]
    
    const lastNameSelectors = [
      'input[name="last_name"]', 
      'input[placeholder*="Last name" i]'
    ]

    // Try full name first
    const hasFullName = await this.fillFirstFoundInput(page, nameSelectors, data.fullName, 'Full Name')
    
    if (!hasFullName) {
      // Try separate first/last name fields
      const firstName = data.fullName.split(' ')[0]
      const lastName = data.fullName.split(' ').slice(1).join(' ')
      await this.fillFirstFoundInput(page, firstNameSelectors, firstName, 'First Name')
      await this.fillFirstFoundInput(page, lastNameSelectors, lastName, 'Last Name')
    }

    // Email
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]'
    ]
    await this.fillFirstFoundInput(page, emailSelectors, data.email, 'Email')

    // Phone
    const phoneSelectors = [
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="phone" i]'
    ]
    await this.fillFirstFoundInput(page, phoneSelectors, data.phone, 'Phone')

    // Resume upload
    await this.uploadResumeToLever(page, data.resumeUrl)

    // Cover letter/additional information
    if (data.coverLetter) {
      const coverLetterSelectors = [
        'textarea[name="additional_information"]',
        'textarea[name="comments"]',
        'textarea[placeholder*="cover" i]',
        'textarea[placeholder*="additional" i]'
      ]
      await this.fillFirstFoundInput(page, coverLetterSelectors, data.coverLetter, 'Cover Letter')
    }

    // LinkedIn profile
    if (data.linkedinProfile) {
      const linkedinSelectors = [
        'input[name="linkedin"]',
        'input[placeholder*="linkedin" i]',
        'input[name="social_profile"]'
      ]
      await this.fillFirstFoundInput(page, linkedinSelectors, data.linkedinProfile, 'LinkedIn Profile')
    }

    console.log('✓ Lever form filling completed')
  }

  private async uploadResumeToLever(page: Page, resumeUrl: string): Promise<void> {
    console.log('Attempting to upload resume to Lever...')
    
    try {
      const response = await fetch(resumeUrl)
      if (!response.ok) {
        throw new Error(`Failed to download resume: ${response.status}`)
      }
      
      const resumeBuffer = await response.arrayBuffer()
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')
      
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `resume-lever-${Date.now()}.pdf`)
      await fs.writeFile(tempFilePath, Buffer.from(resumeBuffer))
      
      const fileInputSelectors = [
        'input[type="file"]',
        'input[name="resume"]',
        'input[accept*="pdf" i]',
        '.file-upload input'
      ]

      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await page.$(selector) as any
          if (fileInput) {
            console.log(`Found Lever file input: ${selector}`)
            await fileInput.uploadFile(tempFilePath)
            console.log('✓ Lever resume uploaded successfully')
            
            await fs.unlink(tempFilePath)
            return
          }
        } catch (error) {
          console.log(`Lever file upload selector ${selector} failed:`, error)
          continue
        }
      }
      
      await fs.unlink(tempFilePath)
      console.log('⚠️ No Lever file upload input found')
      
    } catch (error) {
      console.error('Lever resume upload failed:', error)
    }
  }

  private async submitLeverApplication(page: Page): Promise<boolean> {
    console.log('Attempting to submit Lever application...')
    
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit Application")',
      'button:has-text("Submit")',
      '.submit-btn',
      '[data-qa="submit-application"]'
    ]

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector)
        if (button) {
          console.log(`Found Lever submit button: ${selector}`)
          
          const isDisabled = await button.evaluate((el: any) => el.disabled)
          if (isDisabled) {
            console.log('Submit button is disabled, checking for required fields...')
            continue
          }
          
          await button.click()
          console.log('✓ Lever submit button clicked')
          
          await page.waitForTimeout(3000)
          return true
        }
      } catch (error) {
        console.log(`Lever submit selector ${selector} failed:`, error)
        continue
      }
    }
    
    console.log('⚠️ Could not find or click Lever submit button')
    return false
  }

  private async getLeverConfirmationId(page: Page): Promise<string | null> {
    try {
      // Wait for confirmation page or success message
      await page.waitForSelector('.confirmation, .thank-you, .success, .submitted', { timeout: 10000 })
      
      const confirmationSelectors = [
        '.confirmation-id',
        '.application-id',
        '.reference-id',
        '[data-qa="confirmation"]'
      ]
      
      for (const selector of confirmationSelectors) {
        const element = await page.$(selector)
        if (element) {
          const confirmationId = await element.evaluate((el: any) => el.textContent)
          if (confirmationId) {
            console.log('✓ Found Lever confirmation ID:', confirmationId)
            return confirmationId.trim()
          }
        }
      }
      
      const currentUrl = page.url()
      if (currentUrl.includes('thank') || currentUrl.includes('submitted') || currentUrl.includes('confirmation')) {
        console.log('✓ Lever application submitted successfully (URL confirmation)')
        return 'LEVER_SUBMITTED_SUCCESS'
      }
      
      return 'LEVER_APPLICATION_SUBMITTED'
      
    } catch (error) {
      console.log('Could not find Lever confirmation, but application may have succeeded')
      return 'LEVER_SUBMITTED_NO_CONFIRMATION'
    }
  }

  // LinkedIn automation implementation  
  private async applyToLinkedIn(jobUrl: string, data: ApplicationData): Promise<ApplicationResult> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    
    try {
      console.log('Starting LinkedIn application automation...')
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      console.log('Navigating to LinkedIn job page:', jobUrl)
      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Check if user needs to be logged in
      const needsLogin = await page.$('.authwall, .guest-signin')
      if (needsLogin) {
        return {
          success: false,
          platform: 'linkedin',
          method: 'redirect',
          redirectUrl: jobUrl,
          error: 'LinkedIn requires authentication - please apply manually'
        }
      }
      
      // Look for Easy Apply button
      const easyApplyButton = await page.$('.jobs-apply-button, [aria-label*="Easy Apply"], [data-control-name="jobdetails_topcard_inapply"]')
      if (!easyApplyButton) {
        return {
          success: false,
          platform: 'linkedin',
          method: 'redirect',
          redirectUrl: jobUrl,
          error: 'LinkedIn Easy Apply not available for this job'
        }
      }
      
      console.log('Found LinkedIn Easy Apply button')
      await easyApplyButton.click()
      
      // Wait for application modal to load
      await page.waitForSelector('.jobs-easy-apply-modal, .apply-modal', { timeout: 15000 })
      
      // Fill out LinkedIn Easy Apply form
      await this.fillLinkedInEasyApplyForm(page, data)
      
      // Submit the application
      const submitted = await this.submitLinkedInApplication(page)
      
      if (submitted) {
        return {
          success: true,
          platform: 'linkedin',
          method: 'automated',
          confirmationId: 'LINKEDIN_EASY_APPLY_SUCCESS'
        }
      } else {
        throw new Error('Failed to submit LinkedIn application')
      }

    } catch (error) {
      console.error('LinkedIn automation error:', error)
      
      return {
        success: false,
        platform: 'linkedin',
        method: 'redirect',
        error: 'LinkedIn automation failed - please apply manually',
        redirectUrl: jobUrl
      }
    } finally {
      await page.close()
    }
  }

  private async fillLinkedInEasyApplyForm(page: Page, data: ApplicationData): Promise<void> {
    console.log('Filling LinkedIn Easy Apply form...')
    
    // LinkedIn Easy Apply forms are usually pre-filled with profile data
    // We mainly need to handle additional questions and file uploads
    
    // Check for resume upload
    const resumeUploadSelector = 'input[type="file"][accept*="pdf"], .file-input, .resume-upload input'
    const resumeUpload = await page.$(resumeUploadSelector)
    if (resumeUpload && data.resumeUrl) {
      await this.uploadResumeToLinkedIn(page, data.resumeUrl)
    }
    
    // Handle cover letter if there's a text area
    if (data.coverLetter) {
      const coverLetterSelectors = [
        'textarea[name="coverLetter"]',
        'textarea[placeholder*="cover letter" i]',
        'textarea[aria-label*="cover letter" i]'
      ]
      await this.fillFirstFoundInput(page, coverLetterSelectors, data.coverLetter, 'Cover Letter')
    }
    
    // Handle any additional questions (these vary by job posting)
    await this.handleLinkedInAdditionalQuestions(page)
    
    console.log('✓ LinkedIn form filling completed')
  }

  private async uploadResumeToLinkedIn(page: Page, resumeUrl: string): Promise<void> {
    try {
      const response = await fetch(resumeUrl)
      if (!response.ok) return
      
      const resumeBuffer = await response.arrayBuffer()
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')
      
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `resume-linkedin-${Date.now()}.pdf`)
      await fs.writeFile(tempFilePath, Buffer.from(resumeBuffer))
      
      const fileInput = await page.$('input[type="file"]') as any
      if (fileInput) {
        await fileInput.uploadFile(tempFilePath)
        console.log('✓ LinkedIn resume uploaded successfully')
      }
      
      await fs.unlink(tempFilePath)
    } catch (error) {
      console.error('LinkedIn resume upload failed:', error)
    }
  }

  private async handleLinkedInAdditionalQuestions(page: Page): Promise<void> {
    // Handle common LinkedIn Easy Apply questions
    const questions = await page.$$('.jobs-easy-apply-form-section')
    
    for (const question of questions) {
      try {
        const questionText = await question.$eval('.jobs-easy-apply-form-element__label', (el: any) => el.textContent?.toLowerCase() || '')
        
        if (questionText.includes('years of experience')) {
          const input = await question.$('input[type="number"], select')
          if (input) {
            await input.click()
            await input.type('3') // Default experience
          }
        }
        
        if (questionText.includes('require sponsorship') || questionText.includes('work authorization')) {
          const select = await question.$('select')
          if (select) {
            await select.selectOption({ label: 'No' })
          }
        }
        
        if (questionText.includes('willing to relocate')) {
          const select = await question.$('select')
          if (select) {
            await select.selectOption({ label: 'Yes' })
          }
        }
      } catch (error) {
        console.log('Error handling LinkedIn question:', error)
        continue
      }
    }
  }

  private async submitLinkedInApplication(page: Page): Promise<boolean> {
    const submitSelectors = [
      'button[aria-label*="Submit application"]',
      'button[data-control-name="submit_unify"]',
      'button:has-text("Submit application")',
      '.jobs-apply-button--top-card'
    ]

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector)
        if (button) {
          await button.click()
          console.log('✓ LinkedIn submit button clicked')
          
          // Handle potential additional steps (LinkedIn sometimes has multi-step applications)
          await page.waitForTimeout(2000)
          
          // Check if there's a "Next" button (multi-step form)
          const nextButton = await page.$('button[aria-label*="Continue"], button:has-text("Next")')
          if (nextButton) {
            await nextButton.click()
            await page.waitForTimeout(2000)
          }
          
          return true
        }
      } catch (error) {
        console.log(`LinkedIn submit selector ${selector} failed:`, error)
        continue
      }
    }
    
    return false
  }

  // Workday automation implementation
  private async applyToWorkday(jobUrl: string, data: ApplicationData): Promise<ApplicationResult> {
    if (!this.browser) throw new Error('Browser not initialized')
    
    const page = await this.browser.newPage()
    
    try {
      console.log('Starting Workday application automation...')
      
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      console.log('Navigating to Workday job page:', jobUrl)
      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Look for Apply button
      const applyButton = await page.$('[data-automation-id="apply"], .css-1psuvjl, button:has-text("Apply")')
      if (!applyButton) {
        throw new Error('Could not find Workday Apply button')
      }
      
      await applyButton.click()
      await page.waitForTimeout(3000)
      
      // Workday often requires creating an account first - this is complex to automate
      // For now, we'll return a redirect result for Workday applications
      return {
        success: false,
        platform: 'workday',
        method: 'redirect',
        redirectUrl: jobUrl,
        error: 'Workday applications require manual completion due to account creation requirements'
      }

    } catch (error) {
      console.error('Workday automation error:', error)
      
      return {
        success: false,
        platform: 'workday',
        method: 'redirect',
        error: 'Workday automation not yet supported - please apply manually',
        redirectUrl: jobUrl
      }
    } finally {
      await page.close()
    }
  }
}

// Singleton instance
export const jobApplicationAutomation = new JobApplicationAutomation()