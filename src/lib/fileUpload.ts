import { v2 as cloudinary } from 'cloudinary'
import { uploadFileToS3, deleteFileFromS3 } from './s3'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  fileUrl: string
  fileName: string
  provider: 'cloudinary' | 's3'
}

export interface UploadOptions {
  buffer: Buffer
  fileName: string
  contentType: string
  userId: string
}

// Check if Cloudinary is properly configured
function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// Check if S3 is properly configured
function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  )
}

// Upload file to Cloudinary
async function uploadToCloudinary(options: UploadOptions): Promise<UploadResult> {
  const { buffer, fileName, userId } = options
  
  console.log('Attempting upload to Cloudinary...')
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // For non-image files like PDFs, DOCs
        folder: `helpmeapply/resumes/${userId}`,
        public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`, // Remove extension for public_id
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error)
          reject(new Error(`Cloudinary upload failed: ${error.message}`))
        } else if (result) {
          console.log('Cloudinary upload successful:', result.secure_url)
          resolve({
            fileUrl: result.secure_url,
            fileName: fileName,
            provider: 'cloudinary'
          })
        } else {
          reject(new Error('Cloudinary upload failed: No result returned'))
        }
      }
    )
    
    uploadStream.end(buffer)
  })
}

// Upload file to S3 (existing implementation wrapped)
async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
  const { buffer, fileName, contentType, userId } = options
  
  console.log('Attempting upload to S3...')
  const fileUrl = await uploadFileToS3(buffer, fileName, contentType, userId)
  
  console.log('S3 upload successful:', fileUrl)
  return {
    fileUrl,
    fileName,
    provider: 's3'
  }
}

// Main upload function with priority: Cloudinary first, S3 fallback
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const errors: string[] = []
  
  // Try Cloudinary first (if configured)
  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(options)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Cloudinary error'
      console.warn('Cloudinary upload failed, trying S3 fallback:', errorMessage)
      errors.push(`Cloudinary: ${errorMessage}`)
    }
  } else {
    console.log('Cloudinary not configured, skipping...')
    errors.push('Cloudinary: Not configured')
  }
  
  // Fallback to S3 (if configured)
  if (isS3Configured()) {
    try {
      return await uploadToS3(options)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown S3 error'
      console.error('S3 upload also failed:', errorMessage)
      errors.push(`S3: ${errorMessage}`)
    }
  } else {
    console.log('S3 not configured, no fallback available')
    errors.push('S3: Not configured')
  }
  
  // If both failed, throw an error with details
  throw new Error(`All upload providers failed. Errors: ${errors.join(', ')}`)
}

// Delete file from Cloudinary
async function deleteFromCloudinary(fileUrl: string): Promise<void> {
  console.log('Attempting to delete from Cloudinary:', fileUrl)
  
  // Extract public_id from Cloudinary URL
  const urlParts = fileUrl.split('/')
  const versionAndFilename = urlParts[urlParts.length - 1]
  const folder = urlParts.slice(-3, -1).join('/')
  const publicId = `${folder}/${versionAndFilename.split('.')[0]}`
  
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
    console.log('Cloudinary delete result:', result)
    
    if (result.result !== 'ok') {
      throw new Error(`Cloudinary delete failed: ${result.result}`)
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw error
  }
}

// Main delete function
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl) {
    throw new Error('No file URL provided')
  }
  
  // Determine provider based on URL
  if (fileUrl.includes('cloudinary.com')) {
    await deleteFromCloudinary(fileUrl)
  } else if (fileUrl.includes('amazonaws.com') || fileUrl.includes('s3.')) {
    await deleteFileFromS3(fileUrl)
  } else {
    throw new Error(`Unknown file provider for URL: ${fileUrl}`)
  }
}

// Validation functions (re-exported from s3.ts for consistency)
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
  
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File): boolean {
  const maxSize = 5 * 1024 * 1024 // 5MB
  return file.size <= maxSize
}

// Get service status for debugging
export function getServiceStatus() {
  return {
    cloudinary: {
      configured: isCloudinaryConfigured(),
      priority: 1
    },
    s3: {
      configured: isS3Configured(),
      priority: 2
    }
  }
}