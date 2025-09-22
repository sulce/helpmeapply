import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function uploadFileToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<string> {
  const key = `resumes/${userId}/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private',
  })

  await s3Client.send(command)
  
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
}

export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  const url = new URL(fileUrl)
  const key = url.pathname.substring(1) // Remove leading slash
  
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  })

  await s3Client.send(command)
}

export async function getSignedDownloadUrl(fileUrl: string): Promise<string> {
  const url = new URL(fileUrl)
  const key = url.pathname.substring(1)
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
}

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