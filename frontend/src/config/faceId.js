// ===== Face ID (Teachable Machine) sozlamalari =====
//
// QADAMLAR:
// 1. https://teachablemachine.withgoogle.com → "Image Project" → "Standard image model"
// 2. Har foydalanuvchi uchun klass yarating (nomi MUHIM — pastdagi FACE_MAP bilan mos bo'lsin):
//    masalan klasslar: "Sardor", "Jasur"
// 3. Har klassga webcam orqali yuzingizni o'rgating (30-50 rasm).
// 4. "Train Model" → "Export Model" → "Upload (shareable link)" → URL'ni oling.
//    URL shunday ko'rinadi: https://teachablemachine.withgoogle.com/models/XXXXXXX/
// 5. O'sha URL'ni pastga MODEL_URL ga qo'ying (yoki demo paytida modal ichida kiriting).
//
// ⚠️ Bu HAQIQIY xavfsiz Face ID EMAS — Teachable Machine oddiy rasm klassifikatori.
//    Demo/hackathon uchun mos, lekin production autentifikatsiya sifatida ishlatmang.

export const MODEL_URL = '' // masalan: 'https://teachablemachine.withgoogle.com/models/abcd1234/'

// Klass nomi → qaysi akkauntga kirsin
export const FACE_MAP = {
  Sardor: { email: 'barber@salon.uz', password: 'barber123' },
  Jasur: { email: 'jasur@salon.uz', password: 'jasur123' },
  // 'Class 1': { email: '...', password: '...' },
}

// Ishonch chegarasi (0–1) va necha kadr barqaror bo'lishi kerak
export const CONFIDENCE = 0.92
export const STABLE_FRAMES = 12
