# 🚀 OsonBiznes — Render.com'ga deploy qo'llanmasi

OsonBiznes tizimini Render.com bulutli serveriga joylashtirish bo'yicha to'liq qo'llanma.

---

## 1. Tayyorgarlik

### MongoDB Atlas bazasi
1. [MongoDB Atlas](https://cloud.mongodb.com)'da bepul klaster yarating.
2. Network Access bo'limida `0.0.0.0/0` (barcha IP larga ruxsat) qo'shing.
3. Database Access bo'limida foydalanuvchi va kuchli parol yarating.
4. Ulanish satrini (Connection String) oling:
   `mongodb+srv://<user>:<parol>@cluster0.xxxxx.mongodb.net/osonbiznes?retryWrites=true&w=majority`

---

## 2. GitHub'ga yuklash

```bash
git add .
git commit -m "OsonBiznes full-stack platform"
git push origin main
```

---

## 3. Render.com'da Servislarni Yaratish

### A. Backend (Web Service)
1. **Name:** `osonbiznes-api`
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `MONGODB_URI` = *(MongoDB Atlas ulanish satri)*
   - `JWT_SECRET` = *(Kamida 32 belgili maxfiy kalit)*
   - `FRONTEND_URL` = `https://osonbiznes-web.onrender.com`
   - `TELEGRAM_BOT_TOKEN` = *(BotFather'dan olingan token)*

### B. Frontend (Static Site)
1. **Name:** `osonbiznes-web`
2. **Root Directory:** `frontend`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. **Environment Variables:**
   - `VITE_API_URL` = `https://osonbiznes-api.onrender.com/api`

---

## 4. Boshlang'ich Ma'lumotlar (Seed Data)

Backend birinchi marta ishga tushganda avtomatik ravishda demo do'konlar va admin hisobini yaratadi:

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@osonbiznes.uz` | `Admin123!` |
| Do'kon egasi | `demo@osonbiznes.uz` | `demo123` |
| Do'kon egasi 2 | `bobur@osonbiznes.uz` | `bobur123` |
