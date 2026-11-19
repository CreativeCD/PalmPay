'use strict';
/**
 * upload.js — Multer file-upload middleware (stub).
 *
 * Accepts a single file under the field name 'palm_image'.
 * MIME guard: PNG and JPEG only. Max size from env.
 *
 * Full implementation: Day 3, alongside biometric routes.
 */
const multer = require('multer');

const ALLOWED_MIMES = ['image/png', 'image/jpeg'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 5_242_880 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only PNG and JPEG images are accepted'), { status: 400 }));
    }
  },
});

module.exports = upload.single('palm_image');
