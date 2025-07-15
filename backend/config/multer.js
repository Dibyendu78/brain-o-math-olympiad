const multer = require('multer');
const fs     = require('fs');
const path   = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const reg = req.body.registrationId || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `${ts}-${reg}-payment${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
  cb(ok ? null : new Error('Only image files allowed'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: +process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, files: 1 }
});

const handleMulterError = (err, _, res, next) => {
  if (!err) return next();
  const msg = err.code === 'LIMIT_FILE_SIZE'
    ? 'File too large (max 5 MB)' : err.message;
  res.status(400).json({ success: false, message: msg });
};

module.exports = { upload, handleMulterError };
