'use strict';
const multer = require('multer');

const ALLOWED_MIMES = ['image/png', 'image/jpeg'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 5_242_880 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only PNG and JPEG images are accepted'), { status: 400 }));
    }
  },
});

/** Single-file upload for the field named "palm_image". */
module.exports = upload.single('palm_image');
