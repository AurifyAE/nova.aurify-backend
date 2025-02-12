import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import sharp from "sharp";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_IMAGE_TYPES = ["jpeg", "jpg", "png", "gif", "webp"];

const imageCache = new Map();

export const proxyImage = async (req, res) => {
  try {
    console.log("Proxy request received");

    const imageUrl = req.query.url;
    if (!imageUrl) {
      console.error("No image URL provided");
      return res.status(400).json({ error: "No image URL provided" });
    }

    console.log("Requested Image URL:", imageUrl);

    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      console.error("S3 bucket name is missing in environment variables");
      return res.status(500).json({ error: "S3 bucket configuration error" });
    }

    const keyMatch = imageUrl.match(/\.amazonaws\.com\/(.+)/);
    if (!keyMatch || !keyMatch[1]) {
      console.error("Invalid S3 URL format", imageUrl);
      return res.status(400).json({ error: "Invalid S3 URL format" });
    }

    const key = decodeURIComponent(keyMatch[1]);
    console.log("Extracted S3 Key:", key);

    const fileExtension = path.extname(key).replace(".", "").toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(fileExtension)) {
      console.error(`Unsupported image format: ${fileExtension}`);
      return res.status(400).json({ error: "Unsupported image format" });
    }

    if (imageCache.has(key)) {
      console.log("Serving from cache:", key);
      res.setHeader("Content-Type", imageCache.get(key).contentType);
      return res.end(imageCache.get(key).body);
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    // Fetch the image from S3
    const { Body, ContentType } = await s3.send(command);

    // Read the Body stream
    const chunks = [];
    for await (const chunk of Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const resizedBuffer = await sharp(buffer)
      .resize(500) // Resize width to 500px while maintaining aspect ratio
      .toBuffer();

    imageCache.set(key, { body: resizedBuffer, contentType: ContentType });

    // Send the resized image
    res.setHeader("Content-Type", ContentType);
    res.end(resizedBuffer);
  } catch (error) {
    console.error("Error proxying image:", error);
    res.status(500).json({ error: "Error fetching image" });
  }
};
