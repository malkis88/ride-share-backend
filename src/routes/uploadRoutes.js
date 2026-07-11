const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ride-share-profiles' },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(req.file.buffer);
      });

    const result = await streamUpload();
    res.json({ secure_url: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

module.exports = router;