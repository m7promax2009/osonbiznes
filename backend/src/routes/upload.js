const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticate } = require('../middleware/auth')

// Uploads papkasiga saqlash
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  // SVG QASDAN yo'q: u <script> saqlashi va /uploads dan ochilganda XSS bo'lishi mumkin.
  const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// POST /api/upload - Rasm yuklash (bitta)
router.post('/', authenticate, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Rasm hajmi 5MB dan oshmasligi kerak' })
        }
        return res.status(400).json({ success: false, message: 'Rasm yuklashda xatolik' })
      }
      return res.status(400).json({ success: false, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Rasm tanlanmagan' })
    }
    const imageUrl = `/uploads/${req.file.filename}`
    res.json({ success: true, data: { url: imageUrl, filename: req.file.filename, size: req.file.size } })
  })
})

// POST /api/upload/multiple - Bir nechta rasm yuklash (10 tagacha)
router.post('/multiple', authenticate, (req, res) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Rasm hajmi 5MB dan oshmasligi kerak' })
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, message: 'Ko\'pi bilan 10 ta rasm yuklash mumkin' })
        }
        return res.status(400).json({ success: false, message: 'Rasm yuklashda xatolik' })
      }
      return res.status(400).json({ success: false, message: err.message })
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Rasm tanlanmagan' })
    }
    const files = req.files.map(f => ({
      url: `/uploads/${f.filename}`,
      filename: f.filename,
      size: f.size,
    }))
    res.json({ success: true, data: { files, count: files.length } })
  })
})

module.exports = router
