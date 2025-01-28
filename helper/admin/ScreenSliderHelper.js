import ScreenSliders from "../../model/screenSliders.js";
import mongoose from "mongoose";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const screenSliderHelper = async (data) => {
  try {
    const { sliderId, timeout, imageUrls, createdBy } = data;

    const objectId = new mongoose.Types.ObjectId(createdBy);

    let screenSliderDoc = await ScreenSliders.findOne({ createdBy: objectId });

    if (screenSliderDoc) {
      const slider = screenSliderDoc.sliders.find(
        (s) => s.sliderName === sliderId
      );

      if (slider) {
        slider.images.push(...imageUrls);
        slider.timeout = timeout;
      } else {
        screenSliderDoc.sliders.push({
          sliderName: sliderId,
          timeout,
          images: imageUrls,
        });
      }
    } else {
      screenSliderDoc = new ScreenSliders({
        sliders: [
          {
            sliderName: sliderId,
            timeout,
            images: imageUrls,
          },
        ],
        createdBy: objectId,
      });
    }

    await screenSliderDoc.save();

    return screenSliderDoc;
  } catch (error) {
    throw new Error("Failed to handle screen sliders: " + error.message);
  }
};

export const fetchScreenSliderHelper = async (adminId) => {
  try {
    const objectId = new mongoose.Types.ObjectId(adminId);

    const screenSliderDoc = await ScreenSliders.findOne({
      createdBy: objectId,
    });

    if (!screenSliderDoc) {
      throw new Error("No sliders found for this admin");
    }

    const sliders = screenSliderDoc.sliders.reduce((acc, slider) => {
      acc[slider.sliderName] = {
        images: slider.images.map((img) => img.imageUrl),
        timeout: slider.timeout,
      };
      return acc;
    }, {});

    return sliders;
  } catch (error) {
    throw new Error("Failed to fetch screen sliders: " + error.message);
  }
};

export const updateScreenSliderHelper = async (sliderId, adminId, timeout) => {
  try {
    const objectId = new mongoose.Types.ObjectId(adminId);

    const screenSliderDoc = await ScreenSliders.findOne({
      createdBy: objectId,
    });

    if (!screenSliderDoc) {
      throw new Error("No sliders found for this admin.");
    }

    const slider = screenSliderDoc.sliders.find(
      (s) => s.sliderName === sliderId
    );

    if (!slider) {
      throw new Error(`Slider with ID '${sliderId}' not found.`);
    }

    if (timeout !== undefined) {
      slider.timeout = timeout;
    }

    await screenSliderDoc.save();

    return slider;
  } catch (error) {
    throw new Error("Failed to update screen slider: " + error.message);
  }
};

export const deleteSliderImageHelper = async (sliderId, imageName, adminId) => {
  try {
    const objectId = new mongoose.Types.ObjectId(adminId);

    const screenSliderDoc = await ScreenSliders.findOne({
      createdBy: objectId,
    });

    if (!screenSliderDoc) {
      throw new Error("Sliders not found for the specified admin");
    }

    const slider = screenSliderDoc.sliders.find(
      (s) => s.sliderName === sliderId
    );
    if (!slider) {
      throw new Error(`Slider with ID ${sliderId} not found`);
    }
    // Find the image object in the slider.images array
    const imageToDelete = slider.images.find((img) => img.key === imageName);

    if (!imageToDelete) {
      throw new Error("Image not found in the slider");
    }
    slider.images = slider.images.filter((img) => img.key !== imageName);

    await screenSliderDoc.save();

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: imageToDelete.key, 
    });

    await s3.send(deleteCommand);

    return {
      success: true,
      message: "Image deleted successfully",
      sliders: screenSliderDoc.sliders,
    };
  } catch (error) {
    console.error("Error deleting image:", error);
    throw new Error("Failed to delete image: " + error.message);
  }
};
