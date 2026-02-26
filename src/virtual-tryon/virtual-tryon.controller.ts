import {
  Controller,
  Post,
  Body,
  Get,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { VirtualTryonService } from './virtual-tryon.service';
import { VirtualTryonDto, TryonResponseDto } from './dto/tryon-request.dto';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

@ApiTags('Virtual Try-On')
@Controller('virtual-tryon')
export class VirtualTryonController {
  constructor(
    private readonly tryonService: VirtualTryonService,
  ) {}

  @Post('process')
  @ApiOperation({
    summary: 'Virtual try-on với URLs',
    description: 'Thực hiện virtual try-on với URLs của ảnh người và quần áo'
  })
  @ApiResponse({
    status: 200,
    description: 'Thử đồ thành công',
    type: TryonResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async processWithUrls(@Body() dto: VirtualTryonDto): Promise<TryonResponseDto> {
    return await this.tryonService.virtualTryon(dto);
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Virtual try-on với upload files',
    description: 'Upload ảnh người và quần áo trực tiếp'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        personImage: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh người'
        },
        garmentImage: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh quần áo'
        },
        category: {
          type: 'string',
          enum: ['Upper-body', 'Lower-body', 'Dress'],
          example: 'Upper-body'
        },
        denoiseSteps: {
          type: 'number',
          example: 20
        },
        seed: {
          type: 'number',
          example: -1
        },
        useCache: {
          type: 'boolean',
          example: true
        }
      },
      required: ['personImage', 'garmentImage', 'category']
    }
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'personImage', maxCount: 1 },
        { name: 'garmentImage', maxCount: 1 }
      ],
      {
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new BadRequestException('Only image files are allowed!'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB
        }
      }
    )
  )
  @ApiResponse({
    status: 200,
    description: 'Thử đồ thành công',
    type: TryonResponseDto
  })
  async processWithUpload(
    @UploadedFiles()
    files: {
      personImage?: Express.Multer.File[];
      garmentImage?: Express.Multer.File[];
    },
    @Body() body: any
  ): Promise<TryonResponseDto> {
    if (!files.personImage || !files.garmentImage) {
      throw new BadRequestException('Vui lòng upload cả ảnh người và ảnh quần áo');
    }

    const id = crypto.randomUUID();
    const personTempPath = path.join(os.tmpdir(), `person_${id}.jpg`);
    const garmentTempPath = path.join(os.tmpdir(), `garment_${id}.jpg`);
    fs.writeFileSync(personTempPath, files.personImage[0].buffer);
    fs.writeFileSync(garmentTempPath, files.garmentImage[0].buffer);

    try {
      const dto: VirtualTryonDto = {
        personImage: personTempPath,
        garmentImage: garmentTempPath,
        category: body.category || 'Upper-body',
        denoiseSteps: parseInt(body.denoiseSteps) || 20,
        seed: parseInt(body.seed) || -1,
        useCache: false
      };
      return await this.tryonService.virtualTryon(dto);
    } finally {
      try { fs.unlinkSync(personTempPath); } catch { /* ignore */ }
      try { fs.unlinkSync(garmentTempPath); } catch { /* ignore */ }
    }
  }

  @Post('try-with-product')
  @ApiOperation({
    summary: '🔥 Virtual try-on: Upload ảnh người + URL quần áo từ sản phẩm',
    description: 'Upload ảnh người từ client, garment image dùng URL từ product (Cloudinary)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        personImage: {
          type: 'string',
          format: 'binary',
          description: '📸 Ảnh người (upload file)'
        },
        garmentImageUrl: {
          type: 'string',
          description: '👕 URL ảnh quần áo từ product (Cloudinary)',
          example: 'https://res.cloudinary.com/xxx/image/upload/v123/products/shirt.jpg'
        },
        category: {
          type: 'string',
          enum: ['Upper-body', 'Lower-body', 'Dress'],
          example: 'Upper-body'
        },
        denoiseSteps: {
          type: 'number',
          example: 20
        },
        seed: {
          type: 'number',
          example: -1
        }
      },
      required: ['personImage', 'garmentImageUrl', 'category']
    }
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'personImage', maxCount: 1 }],
      {
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new BadRequestException('Only image files are allowed!'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: 10 * 1024 * 1024 // 10MB
        }
      }
    )
  )
  @ApiResponse({
    status: 200,
    description: 'Thử đồ thành công',
    type: TryonResponseDto
  })
  async tryWithProduct(
    @UploadedFiles() files: { personImage?: Express.Multer.File[] },
    @Body() body: any
  ): Promise<TryonResponseDto> {
    if (!files.personImage || files.personImage.length === 0) {
      throw new BadRequestException('Vui lòng upload ảnh người');
    }

    if (!body.garmentImageUrl) {
      throw new BadRequestException('Vui lòng cung cấp URL ảnh quần áo (garmentImageUrl)');
    }

    const id = crypto.randomUUID();
    const personTempPath = path.join(os.tmpdir(), `person_${id}.jpg`);
    fs.writeFileSync(personTempPath, files.personImage[0].buffer);

    try {
      const dto: VirtualTryonDto = {
        personImage: personTempPath,
        garmentImage: body.garmentImageUrl, // URL from product
        category: body.category || 'Upper-body',
        denoiseSteps: parseInt(body.denoiseSteps) || 20,
        seed: parseInt(body.seed) || -1,
        useCache: false
      };
      return await this.tryonService.virtualTryon(dto);
    } finally {
      try { fs.unlinkSync(personTempPath); } catch { /* ignore */ }
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Kiểm tra kết nối Kaggle',
    description: 'Kiểm tra xem có kết nối được với Kaggle OOTD không'
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái kết nối',
    schema: {
      example: {
        connected: true,
        url: 'https://6301c6363e80cfc00d.gradio.live',
        message: 'Kaggle OOTD service is available'
      }
    }
  })
  async checkHealth() {
    const status = await this.tryonService.checkKaggleConnection();
    return {
      ...status,
      message: status.connected
        ? 'Kaggle OOTD service is available'
        : 'Cannot connect to Kaggle OOTD service'
    };
  }

  @Get('config')
  @ApiOperation({
    summary: 'Lấy cấu hình virtual try-on',
    description: 'Trả về các tham số cấu hình cho client'
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        categories: ['Upper-body', 'Lower-body', 'Dress'],
        denoiseSteps: { min: 10, max: 40, default: 20 },
        seed: { default: -1, description: 'Use -1 for random' },
        maxFileSize: '10MB',
        supportedFormats: ['jpg', 'jpeg', 'png']
      }
    }
  })
  getConfig() {
    return {
      categories: ['Upper-body', 'Lower-body', 'Dress'],
      denoiseSteps: {
        min: 10,
        max: 40,
        default: 20,
        description: 'Số bước denoise, giá trị cao hơn = chất lượng tốt hơn nhưng chậm hơn'
      },
      seed: {
        default: -1,
        description: 'Seed cho reproducibility. Dùng -1 để random'
      },
      maxFileSize: '10MB',
      supportedFormats: ['jpg', 'jpeg', 'png'],
      processingTime: {
        estimated: '30-60 seconds',
        note: 'Thời gian có thể thay đổi tùy vào tải của Kaggle server'
      }
    };
  }
}
