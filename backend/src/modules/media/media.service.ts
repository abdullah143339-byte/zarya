import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHash } from 'crypto';
import { extname } from 'path';

export interface IStorageProvider {
  uploadFile(file: Express.Multer.File, req: Request): Promise<{ url: string; key: string }>;
  deleteFile(key: string): Promise<void>;
}

@Injectable()
export class LocalDiskStorageProvider implements IStorageProvider {
  constructor(private configService: ConfigService) {}

  async uploadFile(file: Express.Multer.File, req: Request): Promise<{ url: string; key: string }> {
    const appUrl = this.configService.get<string>('APP_URL');
    if (appUrl) {
      const url = `${appUrl.replace(/\/$/, '')}/uploads/${file.filename}`;
      return { url, key: file.filename };
    }
    const port = this.configService.get<number>('APP_PORT') || 8080;
    const forwardedProto = (req.headers['x-forwarded-proto']?.toString().split(',')[0] || '').trim();
    const forwardedHost = (req.headers['x-forwarded-host']?.toString().split(',')[0] || '').trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const host = forwardedHost || req.headers.host || `localhost:${port}`;
    const url = `${protocol}://${host}/uploads/${file.filename}`;
    
    return { url, key: file.filename };
  }

  async deleteFile(key: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'uploads', key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private storageProvider: IStorageProvider;

  constructor(private configService: ConfigService) {
    // Easily switchable based on ENV variables in the future
    // if (configService.get('STORAGE_PROVIDER') === 'S3') { this.storageProvider = new S3StorageProvider(...) }
    this.storageProvider = new LocalDiskStorageProvider(configService);
  }

  async uploadMedia(file: Express.Multer.File, req: Request) {
    return this.storageProvider.uploadFile(file, req);
  }

  /**
   * Config-driven presigned upload URL generator.
   * - S3 / Cloudinary presigned PUT URL when configured and the SDK is available.
   * - Otherwise a local multipart fallback plan pointing at the disk endpoint.
   */
  async getPresignedUrl(input: { filename: string; contentType: string; folder?: string }) {
    const provider = (this.configService.get<string>('STORAGE_PROVIDER') || 'local').toLowerCase();
    const key = this.buildKey(input.folder || 'uploads', input.filename);

    if (provider === 's3') {
      const url = await this.tryS3Presign(key, input.contentType);
      if (url) {
        return {
          provider: 's3',
          method: 'PUT',
          url,
          key,
          contentType: input.contentType,
          expiresIn: 900,
          headers: { 'Content-Type': input.contentType },
        };
      }
    }

    if (provider === 'cloudinary') {
      const url = this.tryCloudinaryPresign(key);
      if (url) {
        return {
          provider: 'cloudinary',
          method: 'POST',
          url,
          key,
          contentType: input.contentType,
          expiresIn: 900,
        };
      }
    }

    return {
      provider: 'local',
      method: 'POST',
      url: `/api/v1/uploads/post-media`,
      key,
      contentType: input.contentType,
      expiresIn: 3600,
    };
  }

  private buildKey(folder: string, filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(safeName)}`;
  }

  private async tryS3Presign(key: string, contentType: string): Promise<string | null> {
    const s3Pkg = '@aws-sdk/client-s3';
    const presignerPkg = '@aws-sdk/s3-request-presigner';
    try {
      const s3Module = (await import(s3Pkg)) as Record<string, unknown>;
      const presignerModule = (await import(presignerPkg)) as Record<string, unknown>;
      const S3Client = s3Module.S3Client as new (options: Record<string, unknown>) => {
        send: (command: unknown) => Promise<unknown>;
      };
      const PutObjectCommand = s3Module.PutObjectCommand as new (input: Record<string, unknown>) => Record<string, unknown>;
      const getSignedUrl = presignerModule.getSignedUrl as (
        client: { send: (command: unknown) => Promise<unknown> },
        command: unknown,
        options: { expiresIn: number },
      ) => Promise<string>;

      const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
      const bucket = this.configService.get<string>('S3_BUCKET');
      if (!bucket) return null;
      const client = new S3Client({
        region,
        credentials: {
          accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || '',
          secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || '',
        },
      });
      return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
        expiresIn: 900,
      });
    } catch (err) {
      this.logger.warn(`S3 presigning unavailable, falling back to local upload: ${String(err)}`);
      return null;
    }
  }

  private tryCloudinaryPresign(key: string): string | null {
    const cloud = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloud || !apiKey || !apiSecret) return null;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest('hex');
    return `https://api.cloudinary.com/v1_1/${cloud}/video/upload?api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}&public_id=${encodeURIComponent(key.replace(/^uploads\//, ''))}`;
  }

  async validateMedia(
    mimetype: string,
    type: string,
    isVideo: boolean,
    durationSec: number,
  ) {
    const MAX_REEL_DURATION = 300;
    const MAX_LEARNING_VIDEO_DURATION = 2700;
    const MAX_POST_VIDEO_DURATION = 300;

    if (type === 'avatar') {
      if (isVideo) throw new BadRequestException('Avatar must be an image');
      return;
    }
    if (type === 'post' || type === 'community' || type === 'reel' || type === 'learning') {
      const isImage = mimetype.startsWith('image/');
      if (!isImage && !isVideo) {
        throw new BadRequestException(`Unsupported media type: ${mimetype}`);
      }
    }
    if (type === 'reel') {
      if (!isVideo) throw new BadRequestException('Reel must be a video file');
      if (durationSec > MAX_REEL_DURATION) throw new BadRequestException(`Reel video cannot exceed ${MAX_REEL_DURATION / 60} minutes`);
    }
    if (type === 'learning' && isVideo && durationSec > MAX_LEARNING_VIDEO_DURATION) {
      throw new BadRequestException(`Learning video cannot exceed ${MAX_LEARNING_VIDEO_DURATION / 60} minutes`);
    }
    if ((type === 'post' || type === 'community') && isVideo && durationSec > MAX_POST_VIDEO_DURATION) {
      throw new BadRequestException(`Post video cannot exceed ${MAX_POST_VIDEO_DURATION / 60} minutes`);
    }
  }
}
