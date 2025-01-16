import { 
    S3Client, 
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand 
  } from '@aws-sdk/client-s3';
  import ffmpeg from 'fluent-ffmpeg';
  import fs from 'fs';
  import path from 'path';
  import { pipeline } from 'stream/promises';
  
  class S3VideoManager {
    constructor() {
      this.s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucket = process.env.AWS_S3_BUCKET;
      this.tempDir = path.join(process.cwd(), 'temp');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    }
  
    // Get video from S3
    async getVideo(key) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        });
  
        const response = await this.s3.send(command);
        return response;
      } catch (error) {
        console.error('Error getting video:', error);
        throw new Error('Failed to get video from S3');
      }
    }
  
    // Check if video exists
    async videoExists(key) {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        });
        await this.s3.send(command);
        return true;
      } catch (error) {
        return false;
      }
    }
  
    // Delete video from S3
    async deleteVideo(key) {
      try {
        // Check if video exists before attempting deletion
        const exists = await this.videoExists(key);
        if (!exists) {
          throw new Error('Video not found');
        }
  
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key
        });
  
        await this.s3.send(command);
        return { success: true, message: 'Video deleted successfully' };
      } catch (error) {
        console.error('Error deleting video:', error);
        throw new Error('Failed to delete video from S3');
      }
    }
  
  }
  
  export const videoManager = new S3VideoManager();