# OsonBiznes AI sotuv agenti (Hermes)

Telegram'da potentsial mijozlarga (do'kon egalariga) OsonBiznes'ni tushuntiradi, tariflarni aytadi,
"nega Uzum/OLX emas?" degan savolga javob beradi va ro'yxatdan o'tish / obuna to'loviga yo'naltiradi.

## Xavfsizlik modeli
- Agentda **faqat** `mcp-osonbiznes` toollari bor (`osonbiznes_mcp.py`): tariflar, ro'yxatdan o'tish havolasi,
  to'lov yo'riqnomasi, ochiq statistika, adminga murojaat. Terminal / fayl / brauzer / web **yo'q**.
- Toollar faqat backend'ning **ochiq** endpointlariga murojaat qiladi — agent hech kimning tarifini yoqa olmaydi,
  do'konlar ma'lumotini ko'ra olmaydi. To'lovni faqat admin tasdiqlaydi.
- `skip_context_files: true` — `~/CLAUDE.md` kabi shaxsiy fayllar mijoz suhbatiga tushmaydi.
- Guruhlar o'chirilgan (`group_policy: disabled`), DM ochiq (sotuv boti bo'lgani uchun).

## O'rnatish
```bash
OSONBIZNES_API_URL=https://api.SIZNING-DOMEN.uz/api \
OSONBIZNES_SITE_URL=https://SIZNING-DOMEN.uz \
OSONBIZNES_AGENT_KEY=<backend AGENT_API_KEY bilan bir xil> \
bash agent/install.sh
```
Keyin `~/.hermes/profiles/osonbiznes-sales/.env`:
- `TELEGRAM_BOT_TOKEN` — @BotFather'da **yangi** bot oching (boshqa botlaringiz tokenini ishlatmang)
- `GEMINI_API_KEY` — **billing yoqilgan** kalit. Bepul tarif daqiqasiga 5 so'rov — ommaviy bot uchun yetmaydi.

Ishga tushirish: `hermes -p osonbiznes-sales gateway start`

## Backend sozlamalari (obuna puli sizning kartangizga)
Backend `.env` ga (kodga YOZMANG):
```
PAYMENT_CARD_NUMBER=8600 .... .... ....
PAYMENT_CARD_HOLDER=ISM FAMILIYA
PAYMENT_CARD_BANK=Bank nomi
AGENT_API_KEY=<kamida 24 belgili tasodifiy satr>   # ixtiyoriy: agent murojaatlari uchun kattaroq limit
```
