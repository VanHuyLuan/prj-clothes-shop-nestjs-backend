import { BadRequestException } from '@nestjs/common';

export class FileValidationHelper {
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_FILES = 10;

  /**
   * Validate file mime type
   */
  static validateMimeType(file: any): void {
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File ${file.originalname} has invalid type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
  }

  /**
   * Validate file size
   */
  static validateFileSize(file: any): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File ${file.originalname} is too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Validate files count
   */
  static validateFilesCount(files: any[]): void {
    if (files.length > this.MAX_FILES) {
      throw new BadRequestException(
        `Too many files. Maximum: ${this.MAX_FILES} files`
      );
    }
  }

  /**
   * Validate single file
   */
  static validateSingleFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    
    this.validateMimeType(file);
    this.validateFileSize(file);
  }

  /**
   * Validate multiple files
   */
  static validateMultipleFiles(files: any[]): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    this.validateFilesCount(files);
    files.forEach(file => this.validateSingleFile(file));
  }

  /**
   * Get validation config
   */
  static getValidationConfig() {
    return {
      allowedMimeTypes: this.ALLOWED_MIME_TYPES,
      maxFileSize: this.MAX_FILE_SIZE,
      maxFiles: this.MAX_FILES,
      maxFileSizeMB: this.MAX_FILE_SIZE / (1024 * 1024),
    };
  }
}