# 🚀 Barbero — Render.com'ga deploy

3 ta servis: **backend** (API), **frontend** (sayt), **telegram-bot**. Baza — **MongoDB Atlas** (bepul).

## 1. MongoDB Atlas (baza)
1. https://cloud.mongodb.com → bepul akkaunt → **M0 (Free)** cluster yarating.
2. **Database Access** → foydalanuvchi yarating (login+parol).
3. **Network Access** → `0.0.0.0/0` qo'shing (hamma joydan ruxsat).
4. **Connect → Drivers** → connection string'ni oling:
   `mongodb+srv://<user>:<parol>@cluster0.xxxxx.mongodb.net/barbero?retryWrites=true&w=majority`

## 2. Kodni GitHub'ga
```bash
cd /Users/shodiyor/Desktop/OsonBiznes
git init && git add . && git commit -m "Barbero"
# GitHub'da repo yarating, keyin:
git remote add origin https://github.com/<siz>/barbero.git
git push -u origin main
```
> `.gitignore` `.env` va `node_modules`ni chetlab o'tadi — kalitlar repo'ga tushmaydi. ✅

## 3. Render Blueprint
1. https://render.com → **New → Blueprint** → repo'ni tanlang. `render.yaml` avtomatik o'qiladi (3 servis).
2. **Har servis uchun `sync: false` env'larni to'ldiring:**

**barbero-api:**
- `MONGODB_URI` = Atlas string (yuqoridagi)
- `TELEGRAM_BOT_TOKEN` = @BotFather'dan olingan token
- `FRONTEND_URL` = `https://barbero-web.onrender.com` (frontend URL — deploy'dan keyin aniq bo'ladi)
- `JWT_SECRET` avtomatik yaratiladi ✅

**barbero-web:**
- `VITE_API_URL` = `https://barbero-api.onrender.com/api` (backend URL + `/api`)

**barbero-bot:**
- `TELEGRAM_BOT_TOKEN` = xuddi shu token
- `API_URL` = `https://barbero-api.onrender.com/api`

3. **Apply** → Render 3 servisni quradi.

## 4. Deploy'dan keyin
- Frontend URL'ni oching → sayt ishlaydi.
- Agar frontend backend'ga ulanmasa: `VITE_API_URL` to'g'ri ekanini tekshirib, frontend'ni **Manual Deploy → Clear build cache** qiling (VITE env build vaqtida o'qiladi).
- `FRONTEND_URL`ni haqiqiy frontend URL'ga yangilang (CORS uchun), backend'ni redeploy qiling.

## ⚠️ Muhim
- **Bepul tier**: backend 15 daqiqa harakatsizlikdan keyin "uxlaydi" — birinchi so'rov 30-50 soniya sekin. Demo oldidan bir marta oching (uyg'otish uchun).
- **MONGODB_URI majburiy** — bo'lmasa backend in-memory'ga tushadi (ma'lumot yo'qoladi). Atlas'ni albatta ulang.
- Demo ma'lumotlar (salonlar, sartaroshlar) birinchi ishga tushishda avtomatik yaratiladi.

## Demo akkauntlar (deploy'dan keyin ham)
| Rol | Login | Parol |
|-----|-------|-------|
| Salon egasi | barber@salon.uz | barber123 |
| Sartarosh | jasur@salon.uz | jasur123 |
| Mijoz | login yo'q — bosh sahifa | — |
