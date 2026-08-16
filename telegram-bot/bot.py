"""
Barbero — Sartaroshxona Telegram Boti
Mijoz: Sartarosh tanlash → Xizmat → Kun va bo'sh vaqt → Navbat band qilish → Jonli navbatni kuzatish.
Usta: O'zining bugungi navbatlarini ko'rish, "Keldi/Bajarildi/Kelmadi" qilish.
"""
import os
import logging
from datetime import date, timedelta
import requests
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
logger = logging.getLogger("barbero-bot")

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8834863054:AAFFU49S3iJxi8Zr7N-wMSZKVqzJaT02U5s")
API_URL = os.getenv("API_URL", "http://localhost:5000/api")


def api_get(path):
    try:
        r = requests.get(f"{API_URL}{path}", timeout=8)
        return r.json() if r.ok else None
    except Exception as e:
        logger.error(f"GET {path}: {e}")
        return None


def api_post(path, data):
    try:
        r = requests.post(f"{API_URL}{path}", json=data, timeout=8)
        return r.json(), r.status_code
    except Exception as e:
        logger.error(f"POST {path}: {e}")
        return None, 500


def api_put(path, data):
    try:
        r = requests.put(f"{API_URL}{path}", json=data, timeout=8)
        return r.json(), r.status_code
    except Exception as e:
        logger.error(f"PUT {path}: {e}")
        return None, 500


def fmt_som(n):
    try:
        return f"{int(n):,}".replace(",", " ") + " so'm"
    except Exception:
        return str(n) + " so'm"


STATUS_UZ = {
    "booked": "⏳ Navbatda",
    "arrived": "✂️ Keldi (Stolda)",
    "done": "✅ Bajarildi",
    "no_show": "❌ Kelmadi",
    "cancelled": "🚫 Bekor qilindi",
}


def main_menu():
    return ReplyKeyboardMarkup(
        [
            ["✂️ Navbat olish", "📋 Mening navbatim"],
            ["💈 Sartaroshlar", "💰 Xizmatlar & Narxlar"],
            ["👨‍💼 Sartarosh kabineti", "ℹ️ Yordam"],
        ],
        resize_keyboard=True,
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    first_name = update.effective_user.first_name or "Mijoz"
    await update.message.reply_text(
        f"Assalomu alaykum, *{first_name}*! 👋\n\n"
        "✂️ *Barbero — Mahalladagi Sartaroshxona Onlayn Navbat Boti*\n\n"
        "Ortiqcha navbatda turib vaqt yo'qotmang! Sartaroshni tanlang, qulay vaqtni band qiling va navbatingizni real vaqtda kuzatib boring.\n\n"
        "👇 Quyidagi tugmalardan birini tanlang:",
        parse_mode="Markdown",
        reply_markup=main_menu(),
    )


async def show_barbers(update: Update, context: ContextTypes.DEFAULT_TYPE):
    res = api_get("/barbershops/barbers")
    if not res or not res.get("data"):
        await update.message.reply_text(
            "⚠️ Hozircha faol sartaroshlar topilmadi yoki server bilan aloqa yo'q.\nIltimos, birozdan so'ng qayta urinib ko'ring."
        )
        return
    barbers = res["data"]
    buttons = []
    for b in barbers[:10]:
        stars = "⭐" + str(b.get("rating", 5.0))
        btn_text = f"{b.get('avatar','💈')} {b['name']} ({stars}) — {b.get('branchName','Asosiy')}"
        buttons.append([InlineKeyboardButton(btn_text, callback_data=f"barber:{b['_id']}")])

    buttons.append([InlineKeyboardButton("❌ Bekor qilish", callback_data="cancel")])

    text = "💈 *Sartaroshni tanlang:*\n\nUstalarning tajribasi va reytingiga qarab o'zingizga ma'qulini tanlang:"
    if update.callback_query:
        await update.callback_query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(buttons))
    else:
        await update.message.reply_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(buttons))


async def show_salons_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    res = api_get("/barbershops")
    if not res or not res.get("data"):
        await update.message.reply_text("Salonlar ma'lumoti yuklanmadi.")
        return
    lines = ["💈 *Bizning Sartaroshxonalar va Filiallar:*\n"]
    for s in res["data"]:
        lines.append(f"*{s['name']}* ⭐ {s.get('rating', 5.0)}")
        lines.append(f"_{s.get('description', '')}_")
        for br in s.get("branches", []):
            lines.append(f"  📍 *{br.get('name','')}*: {br.get('address','')}")
            if br.get("phone"):
                lines.append(f"  ☎️ Tel: {br['phone']}")
        lines.append("")
    lines.append("Band qilish uchun pastdagi *✂️ Navbat olish* tugmasini bosing.")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def show_services_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    res = api_get("/barbershops")
    if not res or not res.get("data"):
        await update.message.reply_text("Xizmatlar topilmadi.")
        return
    lines = ["💰 *Sartaroshxona Xizmatlari va Narxlari:*\n"]
    all_services = []
    for s in res["data"]:
        for svc in s.get("services", []):
            if not any(x["name"] == svc["name"] for x in all_services):
                all_services.append(svc)

    for i, svc in enumerate(all_services, 1):
        lines.append(f"{i}. *{svc['name']}* — `{fmt_som(svc['price'])}`")

    lines.append("\n💡 *Eslatma:* 15% kafolat zalogi bilan navbat band qilinadi.")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "cancel":
        context.user_data.clear()
        await query.edit_message_text("Amal bekor qilindi.")
        return

    # 1. Sartarosh tanlandi → Xizmatlar ro'yxati
    if data.startswith("barber:"):
        bid = data.split(":", 1)[1]
        res = api_get("/barbershops/barbers")
        barbers = (res or {}).get("data", [])
        barber = next((b for b in barbers if str(b["_id"]) == str(bid)), None)
        if not barber:
            await query.edit_message_text("Sartarosh topilmadi.")
            return

        context.user_data["barber"] = barber
        salon = api_get(f"/barbershops/{barber['ownerId']}")
        services = (salon or {}).get("data", {}).get("services", [])
        if not services:
            services = [
                {"name": "Fade (zamonaviy)", "price": 60000},
                {"name": "Klassik soch olish", "price": 40000},
                {"name": "Soqol olish", "price": 25000},
                {"name": "Soch + Soqol", "price": 70000},
                {"name": "Bolalar sochi", "price": 30000},
            ]
        context.user_data["services"] = services

        buttons = []
        for i, s in enumerate(services):
            buttons.append([InlineKeyboardButton(f"{s['name']} — {fmt_som(s['price'])}", callback_data=f"svc:{i}")])
        buttons.append([InlineKeyboardButton("⬅️ Boshqa sartarosh", callback_data="back_barbers")])

        await query.edit_message_text(
            f"Tanlandi: {barber.get('avatar','💈')} *{barber['name']}* ⭐{barber.get('rating',5.0)}\n"
            f"📍 Filial: {barber.get('branchName','Asosiy filial')}\n\n"
            f"✂️ *Xizmat turini tanlang:*",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(buttons),
        )

    elif data == "back_barbers":
        await show_barbers(update, context)

    # 2. Xizmat tanlandi → Kun tanlash (Bugun / Ertaga / Indinga)
    elif data.startswith("svc:"):
        idx = int(data.split(":", 1)[1])
        services = context.user_data.get("services", [])
        if idx >= len(services):
            return
        context.user_data["service"] = services[idx]

        today_dt = date.today()
        d0 = today_dt.isoformat()
        d1 = (today_dt + timedelta(days=1)).isoformat()
        d2 = (today_dt + timedelta(days=2)).isoformat()

        buttons = [
            [InlineKeyboardButton(f"🗓 Bugun ({today_dt.strftime('%d-%m')})", callback_data=f"day:{d0}")],
            [InlineKeyboardButton(f"🗓 Ertaga ({(today_dt + timedelta(days=1)).strftime('%d-%m')})", callback_data=f"day:{d1}")],
            [InlineKeyboardButton(f"🗓 Indinga ({(today_dt + timedelta(days=2)).strftime('%d-%m')})", callback_data=f"day:{d2}")],
            [InlineKeyboardButton("⬅️ Xizmatni o'zgartirish", callback_data=f"barber:{context.user_data.get('barber',{}).get('_id')}")],
        ]

        svc = context.user_data["service"]
        await query.edit_message_text(
            f"✂️ Xizmat: *{svc['name']}* ({fmt_som(svc['price'])})\n\n"
            f"🗓 *Qaysi kunga navbat olmoqchisiz?*",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(buttons),
        )

    # 3. Kun tanlandi → Bo'sh vaqt slotlari
    elif data.startswith("day:"):
        chosen_date = data.split(":", 1)[1]
        context.user_data["date"] = chosen_date
        barber = context.user_data.get("barber")
        if not barber:
            await query.edit_message_text("Sartarosh tanlanmagan.")
            return

        res = api_get(f"/barbershops/barbers/{barber['_id']}/slots?date={chosen_date}")
        slots = (res or {}).get("data", {}).get("slots", [])
        free_slots = [s for s in slots if s.get("available")]

        if not free_slots:
            buttons = [[InlineKeyboardButton("⬅️ Boshqa kunni tanlash", callback_data=f"svc:0")]]
            await query.edit_message_text(
                f"😔 *{chosen_date}* kunida {barber['name']} uchun barcha vaqtlar band.\nIltimos, boshqa kunni tanlang:",
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup(buttons),
            )
            return

        buttons, row = [], []
        for s in free_slots[:16]:
            row.append(InlineKeyboardButton(f"⏰ {s['time']}", callback_data=f"slot:{s['time']}"))
            if len(row) == 3:
                buttons.append(row)
                row = []
        if row:
            buttons.append(row)

        buttons.append([InlineKeyboardButton("⬅️ Kunni o'zgartirish", callback_data="svc:0")])

        await query.edit_message_text(
            f"💈 Sartarosh: *{barber['name']}*\n"
            f"🗓 Sana: *{chosen_date}*\n\n"
            f"⏰ *Quyidagi bo'sh vaqtlardan birini tanlang:*",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(buttons),
        )

    # 4. Vaqt tanlandi → Telefon va ism so'rash
    elif data.startswith("slot:"):
        slot_time = data.split(":", 1)[1]
        context.user_data["slot"] = slot_time
        context.user_data["awaiting"] = "phone"

        await query.edit_message_text(
            f"⏰ Tanlangan vaqt: *{context.user_data['date']} soat {slot_time}*\n\n"
            f"📱 Iltimos, navbatni rasmiylashtirish uchun *telefon raqamingizni* yuboring:\n"
            f"_(Masalan: 90 123 45 67)_",
            parse_mode="Markdown",
        )

    # Usta status o'zgartirishi
    elif data.startswith("bk_status:"):
        _, bkid, new_status = data.split(":")
        res, code = api_put(f"/bookings/{bkid}/status", {"status": new_status})
        if code in [200, 201]:
            st_text = STATUS_UZ.get(new_status, new_status)
            await query.edit_message_text(f"✅ Navbat holati o'zgartirildi: *{st_text}*", parse_mode="Markdown")
        else:
            await query.edit_message_text("❌ Holatni o'zgartirishda xatolik.")


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    contact = update.message.contact
    if not contact:
        return
    phone = contact.phone_number
    if not phone.startswith("+"):
        phone = "+" + phone

    awaiting = context.user_data.get("awaiting")
    if awaiting == "phone":
        context.user_data["phone"] = phone
        context.user_data["awaiting"] = "name"
        user_name = update.effective_user.first_name or "Mijoz"
        context.user_data["name"] = user_name
        return await finalize_booking(update, context)
    elif awaiting == "track_phone":
        return await track_by_phone(update, context, phone)


async def finalize_booking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    d = context.user_data
    payload = {
        "barberId": d["barber"]["_id"],
        "service": d["service"]["name"],
        "servicePrice": d["service"]["price"],
        "date": d["date"],
        "timeSlot": d["slot"],
        "customerName": d.get("name") or update.effective_user.first_name or "Mijoz",
        "customerPhone": d.get("phone", "+998 90 123 45 67"),
    }
    res, code = api_post("/bookings", payload)
    if code in [200, 201] and res and res.get("data"):
        b = res["data"]
        dep = b.get("deposit", int(d["service"]["price"] * 0.15))
        await update.message.reply_text(
            f"🎉 *NAVBAT MUVAFFAQIYATLI BAND QILINDI!*\n\n"
            f"💈 *Sartarosh:* {b.get('barberName', d['barber']['name'])}\n"
            f"✂️ *Xizmat:* {b.get('service', d['service']['name'])}\n"
            f"🗓 *Sana va Vaqt:* {b.get('date', d['date'])} {b.get('timeSlot', d['slot'])}\n"
            f"🎫 *Navbat raqamingiz:* `#{b.get('queueNumber', 1)}`\n"
            f"💰 *Xizmat narxi:* {fmt_som(b.get('servicePrice', d['service']['price']))}\n"
            f"🛡️ *Kafolat zalogi (15%):* {fmt_som(dep)}\n\n"
            f"📍 *Manzil:* {d['barber'].get('branchAddress', 'Bunyodkor shoh ko\'chasi 12')}\n\n"
            f"Navbatingiz holatini istalgan payt *📋 Mening navbatim* orqali tekshirishingiz mumkin.",
            parse_mode="Markdown",
            reply_markup=main_menu(),
        )
    else:
        err_msg = (res or {}).get("message", "Ushbu vaqt band bo'lishi mumkin. Qayta urinib ko'ring.")
        await update.message.reply_text(f"❌ Xatolik: {err_msg}", reply_markup=main_menu())
    context.user_data.clear()


async def track_by_phone(update: Update, context: ContextTypes.DEFAULT_TYPE, phone: str):
    context.user_data.pop("awaiting", None)
    res = api_get(f"/bookings/track?phone={phone}")
    items = (res or {}).get("data", [])
    if not items:
        await update.message.reply_text(
            f"🔍 *+{phone.replace('+','') if phone else ''}* raqamida hozircha faol navbat topilmadi.\n\n"
            "Yangi navbat olish uchun *✂️ Navbat olish* tugmasini bosing.",
            parse_mode="Markdown",
            reply_markup=main_menu(),
        )
        return

    lines = ["📋 *Sizning Faol Navbatlaringiz:*\n"]
    for b in items:
        st = STATUS_UZ.get(b["status"], b["status"])
        lines.append(f"💈 *{b['barberName']}* — {b['service']}")
        lines.append(f"🗓 Vaqt: *{b['date']} soat {b['timeSlot']}*")
        lines.append(f"🎫 Navbat: `#{b['queueNumber']}` | Holat: {st}")
        if b["status"] == "booked":
            lines.append(f"👥 Oldingizda: *{b['peopleAhead']} kishi*")
            lines.append(f"⏳ Taxminiy kutish: *~{b['estimatedWaitMin']} daqiqa*\n")
        elif b["status"] == "arrived":
            lines.append("✂️ _Siz zalda kutmoqdasiz, tez orada chaqirilasiz!_\n")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown", reply_markup=main_menu())


async def master_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Ustalar uchun bugungi ro'yxat
    res = api_get("/barbershops/barbers")
    barbers = (res or {}).get("data", [])
    if not barbers:
        await update.message.reply_text("Sartaroshlar topilmadi.")
        return

    buttons = []
    for b in barbers:
        buttons.append([InlineKeyboardButton(f"{b.get('avatar','💈')} {b['name']} (Usta rejimi)", callback_data=f"master_view:{b['_id']}")])

    await update.message.reply_text(
        "👨‍💼 *Sartarosh / Usta Rejimi:*\nO'z ismingizni tanlang:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def handle_master_view(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    bid = query.data.split(":", 1)[1]

    today = date.today().isoformat()
    # Bookings for this barber
    res = api_get("/bookings/today")
    all_bks = (res or {}).get("data", {}).get("bookings", [])
    barber_bks = [b for b in all_bks if str(b.get("barberId")) == str(bid) or str(b.get("barber", {}).get("_id")) == str(bid)]

    if not barber_bks:
        await query.edit_message_text("Bugun sizda hali navbatlar yo'q 🎉")
        return

    lines = [f"💈 *Bugungi Navbatlaringiz ({today}):*\n"]
    buttons = []
    for b in barber_bks:
        st = STATUS_UZ.get(b["status"], b["status"])
        lines.append(f"⏰ *{b['timeSlot']}* — {b['customerName']} ({b['service']}) — {st}")
        if b["status"] == "booked":
            buttons.append([
                InlineKeyboardButton(f"✅ Keldi ({b['timeSlot']})", callback_data=f"bk_status:{b['_id']}:arrived"),
                InlineKeyboardButton(f"❌ Kelmadi", callback_data=f"bk_status:{b['_id']}:no_show"),
            ])
        elif b["status"] == "arrived":
            buttons.append([
                InlineKeyboardButton(f"🎉 Bajarildi ({b['timeSlot']})", callback_data=f"bk_status:{b['_id']}:done"),
            ])

    buttons.append([InlineKeyboardButton("❌ Yopish", callback_data="cancel")])
    await query.edit_message_text("\n".join(lines), parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(buttons))


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()

    if text == "✂️ Navbat olish":
        return await show_barbers(update, context)
    if text == "📋 Mening navbatim":
        context.user_data["awaiting"] = "track_phone"
        await update.message.reply_text(
            "📱 *Telefon raqamingizni yuboring:*\n_(Masalan: 90 123 45 67)_",
            parse_mode="Markdown",
        )
        return
    if text == "💈 Sartaroshlar":
        return await show_salons_info(update, context)
    if text == "💰 Xizmatlar & Narxlar":
        return await show_services_info(update, context)
    if text == "👨‍💼 Sartarosh kabineti":
        return await master_panel(update, context)
    if text == "ℹ️ Yordam":
        await update.message.reply_text(
            "ℹ️ *Barbero Bot Qo'llanmasi*\n\n"
            "1. *✂️ Navbat olish* — sartarosh, xizmat va bo'sh vaqtni tanlab navbat band qiling.\n"
            "2. *📋 Mening navbatim* — navbatingizgacha necha kishi qolganini va qachon kelish kerakligini bilib oling.\n"
            "3. *Zalog tizimi* — 15% depozit orqali navbat kafolatlanadi.\n\n"
            "Savol va takliflar uchun: @OsonBiznesSupport",
            parse_mode="Markdown",
        )
        return

    awaiting = context.user_data.get("awaiting")

    # Navbat kuzatish
    if awaiting == "track_phone":
        return await track_by_phone(update, context, text)

    # Telefon kiritildi
    if awaiting == "phone":
        context.user_data["phone"] = text
        context.user_data["awaiting"] = "name"
        await update.message.reply_text("👤 *Ismingizni kiriting:*", parse_mode="Markdown")
        return

    # Ism kiritildi → Navbatni yaratish
    if awaiting == "name":
        context.user_data["name"] = text
        return await finalize_booking(update, context)

    # Noma'lum buyruq
    await update.message.reply_text(
        "Iltimos, quyidagi menyu tugmalaridan birini tanlang 👇",
        reply_markup=main_menu(),
    )


def main():
    if not TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN topilmadi!")
        return

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler(["navbat", "book"], show_barbers))
    app.add_handler(CommandHandler(["master", "usta"], master_panel))
    app.add_handler(CallbackQueryHandler(handle_master_view, pattern=r"^master_view:"))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.CONTACT, handle_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("💈 Barbero Telegram Boti muvaffaqiyatli ishga tushdi!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
