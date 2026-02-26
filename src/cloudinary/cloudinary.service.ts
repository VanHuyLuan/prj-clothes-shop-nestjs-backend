import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed: No result'));
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadImageFromPath(
    filePath: string,
    folder = 'virtual-tryon',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed: No result'));
          resolve(result.secure_url);
        },
      );
    });
  }

  async uploadImageFromUrl(
    imageUrl: string,
    folder = 'virtual-tryon',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        imageUrl,
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed: No result'));
          resolve(result.secure_url);
        },
      );
    });
  }

  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }
}
