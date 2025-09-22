import { Account } from '@prisma/client'
import { prisma } from './db'

export interface LinkedInProfileData {
  id: string
  name: string
  email: string
  headline?: string
  location?: string
  picture?: string
  industry?: string
}

export interface IndeedProfileData {
  id: string
  name: string
  email: string
  picture?: string
}

export interface ImportedProfileData {
  fullName: string
  email: string
  linkedinUrl?: string
  indeedProfile?: string
  profilePictureUrl?: string
  jobTitlePrefs?: string[]
  location?: string
}

export class ProfileImportService {
  /**
   * Import profile data from LinkedIn OAuth account
   */
  async importFromLinkedIn(userId: string): Promise<ImportedProfileData | null> {
    try {
      // Get LinkedIn account for user
      const linkedinAccount = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'linkedin'
        }
      })

      if (!linkedinAccount?.access_token) {
        throw new Error('No LinkedIn account found or access token expired')
      }

      // Note: This is a basic implementation
      // For full profile data, you'd need LinkedIn Partner API access
      const profileData = await this.fetchLinkedInBasicProfile(linkedinAccount.access_token)
      
      if (!profileData) {
        return null
      }

      return {
        fullName: profileData.name,
        email: profileData.email,
        linkedinUrl: `https://linkedin.com/in/${profileData.id}`,
        profilePictureUrl: profileData.picture,
        jobTitlePrefs: profileData.headline ? [profileData.headline] : [],
        location: profileData.location,
      }
    } catch (error) {
      console.error('LinkedIn import error:', error)
      return null
    }
  }

  /**
   * Import profile data from Indeed OAuth account
   */
  async importFromIndeed(userId: string): Promise<ImportedProfileData | null> {
    try {
      // Get Indeed account for user
      const indeedAccount = await prisma.account.findFirst({
        where: {
          userId,
          provider: 'indeed'
        }
      })

      if (!indeedAccount?.access_token) {
        throw new Error('No Indeed account found or access token expired')
      }

      const profileData = await this.fetchIndeedProfile(indeedAccount.access_token)
      
      if (!profileData) {
        return null
      }

      return {
        fullName: profileData.name,
        email: profileData.email,
        indeedProfile: profileData.id,
        profilePictureUrl: profileData.picture,
      }
    } catch (error) {
      console.error('Indeed import error:', error)
      return null
    }
  }

  /**
   * Fetch basic LinkedIn profile (limited by OAuth scope)
   */
  private async fetchLinkedInBasicProfile(accessToken: string): Promise<LinkedInProfileData | null> {
    try {
      // Basic profile endpoint that works with standard OAuth scopes
      const response = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
      })

      if (!response.ok) {
        console.error('LinkedIn API error:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      
      // Get email from separate endpoint
      const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-RestLi-Protocol-Version': '2.0.0',
        },
      })

      let email = ''
      if (emailResponse.ok) {
        const emailData = await emailResponse.json()
        email = emailData.elements?.[0]?.['handle~']?.emailAddress || ''
      }

      return {
        id: data.id,
        name: `${data.localizedFirstName} ${data.localizedLastName}`,
        email,
        headline: data.headline?.localized?.[Object.keys(data.headline?.localized || {})[0]],
        location: data.locationName,
        picture: data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
      }
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error)
      return null
    }
  }

  /**
   * Fetch Indeed profile using userinfo endpoint
   */
  private async fetchIndeedProfile(accessToken: string): Promise<IndeedProfileData | null> {
    try {
      const response = await fetch('https://secure.indeed.com/v2/api/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Indeed API error:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      
      return {
        id: data.sub || data.id,
        name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
        email: data.email,
        picture: data.picture,
      }
    } catch (error) {
      console.error('Indeed profile fetch error:', error)
      return null
    }
  }

  /**
   * Update user profile with imported data
   */
  async updateProfileWithImportedData(
    userId: string, 
    importedData: ImportedProfileData,
    source: 'linkedin' | 'indeed'
  ): Promise<boolean> {
    try {
      // Get existing profile
      const existingProfile = await prisma.profile.findUnique({
        where: { userId }
      })

      const updateData: any = {}

      // Only update fields that are empty or explicitly requested
      if (!existingProfile?.fullName && importedData.fullName) {
        updateData.fullName = importedData.fullName
      }
      
      if (!existingProfile?.email && importedData.email) {
        updateData.email = importedData.email
      }

      if (source === 'linkedin') {
        if (importedData.linkedinUrl) {
          updateData.linkedinUrl = importedData.linkedinUrl
        }
        if (importedData.jobTitlePrefs && importedData.jobTitlePrefs.length > 0) {
          // Merge with existing job title preferences
          const existing = existingProfile?.jobTitlePrefs ? 
            JSON.parse(existingProfile.jobTitlePrefs) : []
          const merged = [...new Set([...existing, ...importedData.jobTitlePrefs])]
          updateData.jobTitlePrefs = JSON.stringify(merged)
        }
      }

      if (source === 'indeed' && importedData.indeedProfile) {
        updateData.indeedProfile = importedData.indeedProfile
      }

      // Update preferred locations if available
      if (importedData.location) {
        const existing = existingProfile?.preferredLocations ? 
          JSON.parse(existingProfile.preferredLocations) : []
        const merged = [...new Set([...existing, importedData.location])]
        updateData.preferredLocations = JSON.stringify(merged)
      }

      // Update profile if we have any data to update
      if (Object.keys(updateData).length > 0) {
        if (existingProfile) {
          await prisma.profile.update({
            where: { userId },
            data: updateData
          })
        } else {
          // Create new profile with imported data
          await prisma.profile.create({
            data: {
              userId,
              fullName: importedData.fullName,
              email: importedData.email,
              jobTitlePrefs: importedData.jobTitlePrefs ? 
                JSON.stringify(importedData.jobTitlePrefs) : '[]',
              preferredLocations: importedData.location ? 
                JSON.stringify([importedData.location]) : '[]',
              employmentTypes: '["FULL_TIME"]', // Default
              linkedinUrl: importedData.linkedinUrl,
              indeedProfile: importedData.indeedProfile,
              ...updateData
            }
          })
        }
      }

      return true
    } catch (error) {
      console.error('Profile update error:', error)
      return false
    }
  }

  /**
   * Get available import options for a user
   */
  async getAvailableImports(userId: string): Promise<{
    linkedin: boolean
    indeed: boolean
  }> {
    try {
      const accounts = await prisma.account.findMany({
        where: { userId },
        select: { provider: true, access_token: true }
      })

      return {
        linkedin: accounts.some(acc => acc.provider === 'linkedin' && acc.access_token),
        indeed: accounts.some(acc => acc.provider === 'indeed' && acc.access_token)
      }
    } catch (error) {
      console.error('Error checking available imports:', error)
      return { linkedin: false, indeed: false }
    }
  }
}

// Export singleton instance
export const profileImportService = new ProfileImportService()