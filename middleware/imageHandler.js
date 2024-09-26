import path from "path";
import sharp from "sharp";
import { uploadSingle } from "./multer.js";


export default (req, res, next) => {
    const upload = uploadSingle("image");

    upload(req, res, async (err) => {
        if (err) {
            try {
                switch (err.code) {
                    case "LIMIT_INVALID_TYPE":
                        throw new Error("Invalid file type! Only PNG and JPEG are allowed");

                    case "LIMIT_FILE_SIZE":
                        throw new Error("File size is too large! Max size is 2MB");

                    default:
                        throw new Error("Something went wrong!");
                }
            } catch (err) {
                res.status(400).json({ message: err.message });
                return;
            }
        }

        try {
            const filename = `${Date.now()}${path.extname(req.file.originalname)}`;
            const saveTo = path.resolve(import.meta.dirname, "public", "images");
            const filePath = path.join(saveTo, filename);
            await sharp(req.file.path)
                // .resize({ width: 300, height: 300 })
                .webp({ quality: 80 })
                .toFile(filePath);

            req.file.filename = filename;

            next();
        } catch (err) {
            res.status(400).json({ message: err.message });
            return;
        }
    });
};
