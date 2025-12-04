import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadResponse } from './upload.dto';
import { FileValidationHelper } from './file-validation.helper';

@Injectable()
export class UploadService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Upload single image
   */
  async uploadSingleImage(file: any, folder?: string): Promise<UploadResponse> {
    FileValidationHelper.validateSingleFile(file);

    try {
      const url = await this.cloudinaryService.uploadImage(
        file,
        folder || 'products',
      );

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files: any[], folder?: string): Promise<UploadResponse> {
    FileValidationHelper.validateMultipleFiles(files);

    try {
      const uploadPromises = files.map(async (file) => {
        const url = await this.cloudinaryService.uploadImage(
          file,
          folder || 'products',
        );
        return {
          url,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      });

      const results = await Promise.all(uploadPromises);

      return {
        success: true,
        message: `${results.length} images uploaded successfully`,
        data: results,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete image by URL
   */
  async deleteImage(imageUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      // Extract public_id from Cloudinary URL
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      
      if (!publicId) {
        throw new BadRequestException('Invalid Cloudinary URL');
      }

      const success = await this.cloudinaryService.deleteImage(publicId);

      if (success) {
        return {
          success: true,
          message: 'Image deleted successfully',
        };
      } else {
        throw new BadRequestException('Failed to delete image');
      }
    } catch (error) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image_id.jpg
      const matches = url.match(/\/v\d+\/(.+)\.[^.]+$/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get upload configuration
   */
  getUploadConfig() {
    return FileValidationHelper.getValidationConfig();
  }
}