import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Whitelist of safe (non-active) media types only. SVG / HTML are excluded
// because they can carry scripts and would be a stored-XSS vector.
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    // derive the extension from the validated MIME type, never from originalname
    const ext = ALLOWED_TYPES[file.mimetype] || '';
    const base =
      path
        .basename(file.originalname, path.extname(file.originalname) || '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40) || 'file';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('unsupported file type'));
    }
  },
});

const router = Router();

// Public so the apply form can upload without auth.
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  const kind = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  res.status(201).json({
    url: `/media/${req.file.filename}`,
    name: req.file.originalname,
    kind,
  });
});

export default router;
