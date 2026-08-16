// Oddiy in-memory rate limiter (tashqi paketsiz).
// Eslatma: bir nechta server instansiyasi bo'lsa, Redis asosidagi limiter tavsiya etiladi.
function rateLimit({ windowMs = 60000, max = 60, message = "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring." } = {}) {
  const hits = new Map() // key -> { count, resetAt }

  // Eskirgan yozuvlarni davriy tozalash (xotira sizib ketmasligi uchun)
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, rec] of hits) {
      if (now > rec.resetAt) hits.delete(key)
    }
  }, windowMs)
  if (timer.unref) timer.unref()

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    const key = `${ip}:${req.baseUrl}${req.path}`
    const now = Date.now()
    let rec = hits.get(key)
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs }
      hits.set(key, rec)
    }
    rec.count++
    if (rec.count > max) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ success: false, message })
    }
    next()
  }
}

module.exports = { rateLimit }
