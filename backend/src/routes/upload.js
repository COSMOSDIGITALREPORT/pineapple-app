const router     = require('express').Router();
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const auth       = require('../middleware/auth');
const pool       = require('../config/db');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images allowed'), ok);
  },
});

// POST /upload/avatar
router.post('/avatar', auth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pineapple/avatars', resource_type: 'image' },
        (err, result) => err ? reject(err) : resolve(result.secure_url)
      );
      stream.end(req.file.buffer);
    });
    await pool.query('UPDATE users SET avatar_url=? WHERE id=?', [url, req.user.userId]);
    res.json({ url });
  } catch (err) {
    console.error('upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
