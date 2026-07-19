import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const VOLUNTEER_DOCUMENT_BUCKET =
  process.env.S3_BUCKET?.trim() || 'hamyar-bohran-volunteer-documents';
const configuredMaxSizeMb = Number(process.env.S3_MAX_FILE_SIZE_MB);
export const MAX_VOLUNTEER_DOCUMENT_SIZE_MB =
  Number.isFinite(configuredMaxSizeMb) && configuredMaxSizeMb > 0 ? configuredMaxSizeMb : 30;
export const MAX_VOLUNTEER_DOCUMENT_SIZE =
  Math.floor(MAX_VOLUNTEER_DOCUMENT_SIZE_MB * 1024 * 1024);
export const ALLOWED_VOLUNTEER_DOCUMENT_TYPES = new Map([
  ['application/pdf', ['pdf']],
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']]
]);

let storageClient: S3Client | null = null;

export function getStorageClient() {
  if (storageClient) return storageClient;
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim();
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 storage configuration is incomplete');
  }
  storageClient = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }
  });
  return storageClient;
}

export function validateVolunteerDocument(name: string, contentType: string, size: number): string | null {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_VOLUNTEER_DOCUMENT_SIZE) {
    return `حجم فایل باید بیشتر از صفر و حداکثر ${MAX_VOLUNTEER_DOCUMENT_SIZE_MB} مگابایت باشد.`;
  }
  const extension = name.trim().toLowerCase().split('.').pop() || '';
  const allowedExtensions = ALLOWED_VOLUNTEER_DOCUMENT_TYPES.get(contentType.toLowerCase());
  if (!allowedExtensions?.includes(extension)) {
    return 'فقط فایل‌های PDF، JPG، JPEG و PNG مجاز هستند.';
  }
  return null;
}

export async function createVolunteerDocumentUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    getStorageClient(),
    new PutObjectCommand({
      Bucket: VOLUNTEER_DOCUMENT_BUCKET,
      Key: key,
      ContentType: contentType
    }),
    { expiresIn: 5 * 60 }
  );
}

export async function createVolunteerDocumentDownloadUrl(key: string) {
  return getSignedUrl(
    getStorageClient(),
    new GetObjectCommand({ Bucket: VOLUNTEER_DOCUMENT_BUCKET, Key: key }),
    { expiresIn: 60 }
  );
}

export function headVolunteerDocument(key: string) {
  return getStorageClient().send(
    new HeadObjectCommand({ Bucket: VOLUNTEER_DOCUMENT_BUCKET, Key: key })
  );
}

export function deleteVolunteerDocument(key: string) {
  return getStorageClient().send(
    new DeleteObjectCommand({ Bucket: VOLUNTEER_DOCUMENT_BUCKET, Key: key })
  );
}
