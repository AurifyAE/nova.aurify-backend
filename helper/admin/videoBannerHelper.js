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
  
    // Edit video and update in S3
    async editVideo(key, options = {}) {
      try {
        // Check if video exists
        const exists = await this.videoExists(key);
        if (!exists) {
          throw new Error('Video not found');
        }
  
        // Get video from S3
        const video = await this.getVideo(key);
        
        // Create temporary files
        const tempInputPath = path.join(this.tempDir, `input-${Date.now()}.mp4`);
        const tempOutputPath = path.join(this.tempDir, `output-${Date.now()}.mp4`);
  
        // Save S3 video to temp file
        await pipeline(
          video.Body,
          fs.createWriteStream(tempInputPath)
        );
  
        // Process video with ffmpeg based on options
        await new Promise((resolve, reject) => {
          let command = ffmpeg(tempInputPath);
  
          // Apply video editing options
          if (options.startTime) command.setStartTime(options.startTime);
          if (options.duration) command.setDuration(options.duration);
          if (options.resolution) command.size(options.resolution);
          if (options.bitrate) command.videoBitrate(options.bitrate);
          if (options.fps) command.fps(options.fps);
          if (options.audioVolume) command.audioFilters(`volume=${options.audioVolume}`);
  
          command
            .on('end', resolve)
            .on('error', reject)
            .save(tempOutputPath);
        });
  
        // Upload edited video back to S3
        const fileStream = fs.createReadStream(tempOutputPath);
        const uploadCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileStream,
          ContentType: 'video/mp4'
        });
  
        await this.s3.send(uploadCommand);
  
        // Clean up temp files
        fs.unlinkSync(tempInputPath);
        fs.unlinkSync(tempOutputPath);
  
        return { 
          success: true, 
          message: 'Video edited and updated successfully',
          key: key
        };
      } catch (error) {
        console.error('Error editing video:', error);
        throw new Error('Failed to edit video');
      }
    }
  }
  
  export const videoManager = new S3VideoManager();