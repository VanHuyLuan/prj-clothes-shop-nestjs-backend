import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponse } from './upload.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Get upload configuration
   */
  @Get('config')
  @ApiOperation({ summary: 'Get upload configuration' })
  @ApiResponse({ status: 200, description: 'Upload configuration retrieved successfully' })
  getUploadConfig() {
    return this.uploadService.getUploadConfig();
  }

  /**
   * Upload single image
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpeg, png, gif, webp, max 5MB)'
        },
        folder: {
          type: 'string',
          description: 'Folder name (optional, default: products)',
          example: 'products'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Image uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/products/abc.jpg' },
            originalName: { type: 'string', example: 'product.jpg' },
            size: { type: 'number', example: 245760 },
            mimeType: { type: 'string', example: 'image/jpeg' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or validation error' })
  async uploadImage(
    @UploadedFile() file: any,
    @Body('folder') folder?: string,
  ): Promise<UploadResponse> {
    return this.uploadService.uploadSingleImage(file, folder);
  }

  /**
   * Upload multiple images
   */
  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Giới hạn 10 files
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multiple image files to upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Image files (max 10 files, each max 5MB)'
        },
        folder: {
          type: 'string',
          description: 'Folder name (optional, default: products)',
          example: 'products'
        }
      },
      required: ['files']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '2 images uploaded successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              originalName: { type: 'string' },
              size: { type: 'number' },
              mimeType: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid files or validation error' })
  async uploadMultipleImages(
    @UploadedFiles() files: any[],
    @Body('folder') folder?: string,
  ): Promise<UploadResponse> {
    return this.uploadService.uploadMultipleImages(files, folder);
  }

  /**
   * Delete image by URL
   */
  @Delete('image')
  @ApiOperation({ summary: 'Delete image by URL' })
  @ApiResponse({ 
    status: 200, 
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Image deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid URL or delete failed' })
  async deleteImage(@Query('url') imageUrl: string) {
    return this.uploadService.deleteImage(imageUrl);
  }
}
