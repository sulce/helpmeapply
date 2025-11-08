import { v2 as cloudinary } from 'cloudinary'
import { uploadFileToS3, deleteFileFromS3 } from './s3'
import { promises as fs } from 'fs'
import path from 'path'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  fileUrl: string
  fileName: string
  provider: 'cloudinary' | 's3' | 'local'
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

// Upload file to local storage (development fallback)
async function uploadToLocal(options: UploadOptions): Promise<UploadResult> {
  const { buffer, fileName, userId } = options
  
  console.log('Attempting upload to local storage...')
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes', userId)
  await fs.mkdir(uploadsDir, { recursive: true })
  
  // Create unique filename
  const timestamp = Date.now()
  const fileExtension = path.extname(fileName)
  const baseName = path.basename(fileName, fileExtension)
  const uniqueFileName = `${timestamp}-${baseName}${fileExtension}`
  const filePath = path.join(uploadsDir, uniqueFileName)
  
  // Write file
  await fs.writeFile(filePath, buffer)
  
  // Return public URL
  const fileUrl = `/uploads/resumes/${userId}/${uniqueFileName}`
  
  console.log('Local storage upload successful:', fileUrl)
  return {
    fileUrl,
    fileName,
    provider: 'local'
  }
}

// Delete file from local storage
async function deleteFromLocal(fileUrl: string): Promise<void> {
  console.log('Attempting to delete from local storage:', fileUrl)
  
  try {
    const filePath = path.join(process.cwd(), 'public', fileUrl)
    await fs.unlink(filePath)
    console.log('Local file deleted successfully')
  } catch (error) {
    console.error('Local file delete error:', error)
    // Don't throw error if file doesn't exist
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
      throw error
    }
  }
}

// Main upload function with priority: Cloudinary first, S3 second, Local fallback
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
      console.warn('S3 upload failed, trying local storage fallback:', errorMessage)
      errors.push(`S3: ${errorMessage}`)
    }
  } else {
    console.log('S3 not configured, trying local storage...')
    errors.push('S3: Not configured')
  }
  
  // Final fallback to local storage (always available in development)
  try {
    console.log('Using local storage as final fallback...')
    return await uploadToLocal(options)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown local storage error'
    console.error('Local storage upload also failed:', errorMessage)
    errors.push(`Local: ${errorMessage}`)
  }
  
  // If all failed, throw an error with details
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
  } else if (fileUrl.startsWith('/uploads/')) {
    // Local storage file
    await deleteFromLocal(fileUrl)
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
    },
    local: {
      configured: true, // Always available
      priority: 3
    }
  }
}