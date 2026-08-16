# 🏪 OsonBiznes

**O'zbekiston kichik bizneslari uchun hammasi-bitta boshqaruv tizimi**

![Version](https://img.shields.io/badge/version-1.0.0-emerald)
![React](https://img.shields.io/badge/React-18-blue)
![Express](https://img.shields.io/badge/Express-4-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 📋 Mundarija

- [Biznes reja](#-biznes-reja)
- [Imkoniyatlar](#-imkoniyatlar)
- [Texnologiyalar](#-texnologiyalar)
- [O'rnatish](#-o%CA%B9rnatish)
- [Ishga tushirish](#-ishga-tushirish)
- [Telegram Bot](#-telegram-bot)
- [Sotish strategiyasi](#-sotish-strategiyasi)
- [Litsenziya](#-litsenziya)

---

## 🎯 Biznes reja

### Muammo
O'zbekistonda 500,000+ kichik bizneslar hali ham:
- 📝 Daftarda hisob yuritadi
- 📞 Telegram orqali buyurtma qabul qiladi
- 🧾 Qo'lda hisob-faktura yozadi
- 📊 Excel da sotuv hisobotini tayyorlaydi

### Yechim: OsonBiznes
- ✅ Hammasi bir joyda
- ✅ O'zbek tilida
- ✅ Arzon (99,000 so'm/oy)
- ✅ Telegram bot bilan integratsiya
- ✅ Click, Payme, Uzum bilan ishlaydi

### Daromad modeli
| Tarif | Narx/oy | Cheklovlar |
|-------|----------|------------|
| Bepul | 0 so'm | 10 ta mahsulot, 30 ta mijoz |
| Start | 99,000 so'm | 50 ta mahsulot, 100 ta mijoz |
| Pro | 199,000 so'm | 200 ta mahsulot, 500 ta mijoz |
| Biznes | 499,000 so'm | Cheksiz |

### Prognoz (6 oy)
- 500+ ro'yxatdan o'tgan
- 80+ faol to'lovchi
- MRR: $640+
- Churn: <5%

---

## ✨ Imkoniyatlar

### 📊 Dashboard
- Kunlik, haftalik, oylik sotuv hisobotlari
- Eng ko'p sotiladigan mahsulotlar
- Oxirgi buyurtmalar
- Real-time statistika

### 📦 Mahsulotlar boshqaruvi
- Mahsulotlarni qo'shish/tahrirlash/o'chirish
- Kategoriya bo'yicha filtrlash
- SKU va shtrix kod
- Qoldiq hisobi (kam qoldi bildirishnomasi)
- Qidirish

### 🛒 Buyurtmalar
- Buyurtma yaratish va boshqarish
- Status o'zgartirish (kutilmoqda, yetkazilmoqda, bajarildi)
- To'lov holati
- Telegram/veb-sayt/qo'lda kiritish

### 👥 Mijozlar bazasi
- Mijoz ma'lumotlari
- Xarid tarixi
- Reyting va teglar
- Shaharlar bo'yicha

### 🧾 Hisob-fakturalar
- QQS bilan hisob-faktura
- To'lov muddatini kuzatish
- Yuklab olish (PDF)

### 💳 Sotuv (POS)
- Tez sotuv interfeysi
- Naqd/karta/Click orqali to'lov
- Chek chop etish

### 🤖 Telegram Bot
- Mahsulot katalogi
- Buyurtma berish
- Buyurtma holatini tekshirish
- Avtomatik xabarlar

---

## 🛠 Texnologiyalar

### Frontend
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons
- **React Router 6** - Routing
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express 4** - Web framework
- **MongoDB** - Database (Atlas yoki lokal)
- **Mongoose** - ODM
- **JWT** - Authentication
- **Telegram bot** - Python (python-telegram-bot), REST orqali backend bilan

### Deployment
- **Docker** + Docker Compose
- **Nginx** - Web server
- **Let's Encrypt** - SSL

---

## 🚀 O'rnatish

### Talablar
- Node.js 18+
- MongoDB (Atlas connection string yoki lokal `mongod`)
- Python 3.11+ (Telegram bot uchun)
- Telegram bot token (@BotFather)

### 1. Reponi klonlash
```bash
git clone https://github.com/yourusername/osonbiznes.git
cd osonbiznes
```

### 2. Backend o'rnatish
```bash
cd backend
npm install
cp .env.example .env
# .env faylini sozlang
```

### 3. Frontend o'rnatish
```bash
cd frontend
npm install
```

### 4. Ma'lumotlar bazasi
Alohida sxema yaratish shart emas — backend `MONGODB_URI` (Atlas yoki lokal) ga ulanadi
va birinchi ishga tushishda demo ma'lumotlarni avtomatik yaratadi (`src/config/db.js`).
`MONGODB_URI` bo'lmasa, lokal in-memory MongoDB'ga tushib, demo bilan ishlaydi.

> Eslatma: `database/schema.sql` — ESKI PostgreSQL sxemasi, ishlatilmaydi (LEGACY).

---

## 🖥 Ishga tushirish

### Development rejimida
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000
Demo login: `demo@osonbiznes.uz` / `demo123`

### Production rejimida (Docker)
```bash
# deploy/.env faylini to'ldiring (JWT_SECRET, TELEGRAM_BOT_TOKEN)
cp deploy/.env.example deploy/.env
docker compose -f deploy/docker-compose.yml up -d --build
```
Stack: MongoDB + backend (Node) + frontend (Nginx) + Telegram bot (Python).
TLS/HTTPS tashqi reverse-proxy (Caddy/host nginx/Cloudflare) orqali termalanadi.

### Production rejimida (manual)
```bash
# Backend
cd backend
NODE_ENV=production npm start

# Frontend build
cd frontend
npm run build
# dist/ papkasini nginx ga ko'rsating
```

---

## 🤖 Telegram Bot

### Bot sozlash
1. [@BotFather](https://t.me/BotFather) ga murojaat qiling
2. `/newbot` buyrug'i bilan yangi bot yarating
3. Olingan tokenni `TELEGRAM_BOT_TOKEN` ga yozing
4. Botni ishga tushiring (Python):
```bash
cd telegram-bot
cp .env.example .env   # TELEGRAM_BOT_TOKEN va API_URL ni to'ldiring
pip install -r requirements.txt
python bot.py
```

### Bot buyruqlari
| Buyruq | Vazifasi |
|--------|----------|
| /start | Botni ishga tushirish |
| /mahsulotlar | Katalogni ko'rish |
| /buyurtma | Yangi buyurtma |
| /buyurtmalarim | Buyurtmalarni ko'rish |
| /kabinet | Shaxsiy kabinet |
| /aloqa | Bog'lanish |

---

## 💰 Sotish strategiyasi

### 1-oy: Baza yaratish
- 👥 Do'stlar, tanishlar, oila bizneslari - bepul
- 📸 Video-reviewlar olish
- 📝 Case study: "Qanday qilib Alisher do'koni daromadini 30% oshirdi"

### 2-oy: Marketing
- 📱 Instagram Reels: "1 daqiqada 10 ta hisob-faktura"
- 📢 Telegram kanal @OsonBiznesUz
- 🎯 Target: Toshkent, Samarqand, Farg'ona (25-45 yosh)

### 3-oy: Monetizatsiya
- 💳 Birinchi 10 mijozga 50% chegirma
- 🤝 Buxgalterlarga 30% komissiya
- 🏪 IT-Park residentlari uchun 20% chegirma

### 4-6 oy: Kengayish
- 📊 Yillik to'lovga 2 oy bepul
- 🔄 Referral dasturi: "Bitta do'kon - 1 oy bepul"
- 📈 Target: 80+ faol to'lovchi

---

## 📞 Support

- 📧 Email: info@osonbiznes.uz
- 📱 Telegram: @OsonBiznesSupport
- 📢 Kanal: @OsonBiznesUz
- 🌐 Sayt: osonbiznes.uz

---

## 📄 Litsenziya

MIT License - erkin foydalaning, o'zgartiring va targ'ib qiling!

---

**⭐ Star qilishni unutmang!**

Made with ❤️ for Uzbekistan small businesses
