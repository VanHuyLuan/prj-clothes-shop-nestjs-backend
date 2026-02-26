import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VirtualTryonDto, TryonResponseDto } from './dto/tryon-request.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class VirtualTryonService {
  private readonly logger = new Logger(VirtualTryonService.name);
  private readonly kaggleUrl: string;

  constructor(
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.kaggleUrl = this.configService.get<string>('KAGGLE_OOTD_URL') || 
                     'https://6301c6363e80cfc00d.gradio.live';
  }

  private async downloadImage(url: string, outputPath: string): Promise<string> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(outputPath, response.data);
      return outputPath;
    } catch (error) {
      this.logger.error(`Error downloading image: ${error.message}`);
      throw new BadRequestException('Failed to download image');
    }
  }

  async virtualTryon(dto: VirtualTryonDto): Promise<TryonResponseDto> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const tempFiles: string[] = [];

    this.logger.log(`[${requestId}] Starting virtual try-on with category: ${dto.category}`);

    try {
      let personImagePath: string;
      let garmentImagePath: string;

      // Download person image to OS temp dir if it's a URL
      if (dto.personImage.startsWith('http')) {
        const tempPersonPath = path.join(os.tmpdir(), `person_${requestId}.jpg`);
        personImagePath = await this.downloadImage(dto.personImage, tempPersonPath);
        tempFiles.push(tempPersonPath);
      } else {
        personImagePath = path.isAbsolute(dto.personImage)
          ? dto.personImage
          : path.resolve(process.cwd(), dto.personImage);
      }

      // Download garment image to OS temp dir if it's a URL
      if (dto.garmentImage.startsWith('http')) {
        const tempGarmentPath = path.join(os.tmpdir(), `garment_${requestId}.jpg`);
        garmentImagePath = await this.downloadImage(dto.garmentImage, tempGarmentPath);
        tempFiles.push(tempGarmentPath);
      } else {
        garmentImagePath = path.isAbsolute(dto.garmentImage)
          ? dto.garmentImage
          : path.resolve(process.cwd(), dto.garmentImage);
      }

      // Call Kaggle Gradio API
      const result = await this.callKaggleAPI(
        personImagePath,
        garmentImagePath,
        dto.category,
        dto.denoiseSteps || 20,
        dto.seed || -1
      );

      const processingTime = Date.now() - startTime;

      return {
        outputImage: result,
        message: '✅ Thử đồ thành công!',
        success: true,
        requestId,
        processingTime
      };

    } catch (error) {
      this.logger.error(`[${requestId}] Error: ${error.message}`);
      return {
        outputImage: '',
        message: `❌ Lỗi: ${error.message}`,
        success: false,
        requestId,
        processingTime: Date.now() - startTime
      };
    } finally {
      // Clean up temp files from OS temp dir
      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
      }
    }
  }

  private async callKaggleAPI(
    personPath: string,
    garmentPath: string,
    category: string,
    denoiseSteps: number,
    seed: number
  ): Promise<string> {
    this.logger.debug(`Calling Gradio API directly via HTTP...`);

    try {
      // Step 1: Upload files to Gradio server
      this.logger.debug('Uploading files to Gradio...');
      const form = new FormData();
      
      // Append files as streams
      form.append('files', fs.createReadStream(personPath), { 
        filename: 'person.png',
        contentType: 'image/png'
      });
      form.append('files', fs.createReadStream(garmentPath), { 
        filename: 'garment.png',
        contentType: 'image/png'
      });

      const uploadRes = await axios.post(`${this.kaggleUrl}/upload`, form, {
        headers: { ...form.getHeaders() },
        timeout: 30000,
      });

      const [uploadedPersonPath, uploadedGarmentPath] = uploadRes.data;
      this.logger.debug(`Files uploaded: ${JSON.stringify(uploadRes.data)}`);

      // Step 2: Call predict API
      const apiEndpoint = category === 'Upper-body' ? '/process_hd' : '/process_dc';
      this.logger.debug(`Using API endpoint: /run${apiEndpoint}`);
      
      const payload: any = {
        data: [
          { path: uploadedPersonPath },   // vton_img
          { path: uploadedGarmentPath },  // garm_img
          1,                              // n_samples
          denoiseSteps || 20,             // n_steps
          2.0,                            // guidance scale
          seed || -1,                     // seed
        ],
      };

      // For DC model (Lower-body/Dress), insert category parameter
      if (category !== 'Upper-body') {
        payload.data.splice(2, 0, category); 
      }

      this.logger.debug(`Sending payload: ${JSON.stringify(payload)}`);

      const result = await axios.post(`${this.kaggleUrl}/run${apiEndpoint}`, payload, {
        timeout: 180000, // 3 minutes
      });

      this.logger.debug(`Gradio response: ${JSON.stringify(result.data)}`);

      // Extract output image URL or path (Kaggle returns path, local Gradio might return url)
      const imageData = result.data?.data?.[0]?.[0]?.image;
      const outputImage = imageData?.url || imageData?.path;
      
      if (!outputImage) {
        throw new Error('No output image in response');
      }

      // Handle different URL formats
      let imageUrl = outputImage;
      if (outputImage.startsWith('/file=')) {
        imageUrl = `${this.kaggleUrl}${outputImage}`;
      } else if (!outputImage.startsWith('http')) {
        // For Kaggle Gradio, construct the file URL
        imageUrl = `${this.kaggleUrl}/file=${outputImage}`;
      }

      this.logger.debug(`Gradio image URL: ${imageUrl}`);
      
      // Upload directly to Cloudinary from URL (no local cache needed)
      this.logger.debug(`Uploading result to Cloudinary...`);
      const cloudinaryUrl = await this.cloudinaryService.uploadImageFromUrl(imageUrl);
      this.logger.debug(`Cloudinary URL: ${cloudinaryUrl}`);
      
      // COMMENT: Removed local cache download/upload/delete
      // const outputPath = path.join(this.cacheDir, `output_${Date.now()}.jpg`);
      // await this.downloadImage(imageUrl, outputPath);
      // const cloudinaryUrl = await this.cloudinaryService.uploadImageFromPath(outputPath);
      // fs.unlinkSync(outputPath);
      
      return cloudinaryUrl;

    } catch (error) {
      if (error.response) {
        this.logger.error(`Gradio API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`Error: ${error.message}`);
      }
      throw new BadRequestException(`Kaggle API call failed: ${error.message}`);
    }
  }

  async checkKaggleConnection(): Promise<{ connected: boolean; url: string }> {
    try {
      const response = await axios.get(this.kaggleUrl, { timeout: 5000 });
      return {
        connected: response.status === 200,
        url: this.kaggleUrl
      };
    } catch (error) {
      return {
        connected: false,
        url: this.kaggleUrl
      };
    }
  }
}
