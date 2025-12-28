import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary if available
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

interface AudioUploadResult {
  url: string
  publicId: string
  duration?: number
  format: string
}

export async function uploadAudioFile(
  audioBlob: Blob,
  fileName: string,
  folder: string = 'interview-audio'
): Promise<AudioUploadResult> {
  // Convert blob to buffer
  const arrayBuffer = await audioBlob.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Try Cloudinary first (preferred for audio)
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return uploadToCloudinary(buffer, fileName, folder)
  }

  // Fallback to S3
  if (process.env.AWS_ACCESS_KEY_ID) {
    return uploadToS3(buffer, fileName, folder)
  }

  // If no storage is configured, throw error
  throw new Error('No audio storage service configured')
}

async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<AudioUploadResult> {
  try {
    // Create data URL for upload
    const base64 = buffer.toString('base64')
    const dataUrl = `data:audio/webm;base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUrl, {
      resource_type: 'video', // Cloudinary treats audio as video
      folder: folder,
      public_id: fileName,
      format: 'mp3', // Convert to MP3 for better compatibility
      audio_codec: 'mp3'
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format
    }
  } catch (error) {
    console.error('Cloudinary upload failed:', error)
    throw new Error('Failed to upload audio to Cloudinary')
  }
}

async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<AudioUploadResult> {
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const key = `${folder}/${fileName}.webm`
    const bucketName = process.env.AWS_S3_BUCKET!

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'audio/webm',
    })

    await s3Client.send(command)

    const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

    return {
      url: url,
      publicId: key,
      format: 'webm'
    }
  } catch (error) {
    console.error('S3 upload failed:', error)
    throw new Error('Failed to upload audio to S3')
  }
}

export async function deleteAudioFile(publicId: string): Promise<void> {
  try {
    // Try Cloudinary first
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' })
      return
    }

    // Try S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: publicId,
      })

      await s3Client.send(command)
    }
  } catch (error) {
    console.error('Failed to delete audio file:', error)
    // Don't throw error for cleanup operations
  }
}

export function generateAudioFileName(sessionId: string, questionIndex: number, type: 'question' | 'answer'): string {
  const timestamp = Date.now()
  return `session-${sessionId}-q${questionIndex}-${type}-${timestamp}`
}