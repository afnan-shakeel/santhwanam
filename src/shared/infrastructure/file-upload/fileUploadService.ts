/**
 * File Upload Service - Local Storage Implementation
 * Stores files in local filesystem: uploads/memberId/death_claim_docs/filename.ext
 * Can be replaced with cloud storage (AWS S3, Supabase Storage, etc.) in the future
 */

import fs from 'fs/promises';
import path from 'path';
import { AppError } from '@/shared/utils/error-handling/AppError';
import { logger } from '@/shared/utils/logger';

export interface UploadFileInput {
  memberId: string;
  category: 'death_claim_docs' | 'member_docs' | 'nominee_docs';
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
}

export interface FileUploadResult {
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export class FileUploadService {
  private readonly baseUploadDir: string;

  constructor(baseUploadDir: string = 'uploads') {
    this.baseUploadDir = baseUploadDir;
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(input: UploadFileInput): Promise<FileUploadResult> {
    try {
      // Construct directory path
      const dirPath = path.join(this.baseUploadDir, input.memberId, input.category);

      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });

      // Sanitize filename to prevent path traversal
      const sanitizedFileName = this.sanitizeFileName(input.fileName);

      // Full file path
      const filePath = path.join(dirPath, sanitizedFileName);

      // Write file to disk
      await fs.writeFile(filePath, input.fileBuffer);

      // Get file stats
      const stats = await fs.stat(filePath);

      logger.info('File uploaded successfully', {
        memberId: input.memberId,
        category: input.category,
        fileName: sanitizedFileName,
        fileSize: stats.size,
      });

      return {
        fileUrl: filePath,
        fileSize: stats.size,
        mimeType: input.mimeType,
      };
    } catch (error) {
      logger.error('File upload failed', {
        memberId: input.memberId,
        category: input.category,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('File upload failed', 500);
    }
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      await fs.unlink(fileUrl);

      logger.info('File deleted successfully', { fileUrl });
    } catch (error) {
      logger.error('File deletion failed', {
        fileUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('File deletion failed', 500);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileUrl: string): Promise<boolean> {
    try {
      await fs.access(fileUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file buffer (for downloading/serving files)
   */
  async getFile(fileUrl: string): Promise<Buffer> {
    try {
      return await fs.readFile(fileUrl);
    } catch (error) {
      logger.error('File read failed', {
        fileUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError('File not found', 404);
    }
  }

  /**
   * Sanitize filename to prevent directory traversal attacks
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path separators and other dangerous characters
    return fileName
      .replace(/[/\\]/g, '_')
      .replace(/[^\w\s.-]/g, '')
      .trim();
  }

  /**
   * Validate file size (max 5MB)
   */
  validateFileSize(fileSize: number, maxSizeMB: number = 5): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (fileSize > maxSizeBytes) {
      throw new AppError(`File size exceeds maximum allowed size of ${maxSizeMB}MB`, 400);
    }
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string, allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']): void {
    if (!allowedTypes.includes(mimeType)) {
      throw new AppError(`File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`, 400);
    }
  }
}
