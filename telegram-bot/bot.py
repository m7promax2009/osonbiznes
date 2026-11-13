"""
OsonBiznes Telegram Bot (Python) - Multi-Store Edition
- Uses REST API for all data (compatible with MongoDB Memory Server)
- Browse multiple shops from one bot
- Each shop has its own catalog
- Customers can switch between shops freely
"""
import asyncio

import os
import logging
import time
import json
from datetime import datetime
from dotenv import load_dotenv
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_URL = os.getenv("API_URL", "http://localhost:5000/api")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# === CACHING ===
shop_cache = {"data": None, "timestamp": 0, "ttl": 15}
product_cache = {}

def api_get(endpoint, timeout=8):
    """Make GET request to API with error handling"""
    try:
        resp = requests.get(f"{API_URL}{endpoint}", timeout=timeout)
        if resp.ok:
            return resp.json()
        logger.warning(f"API GET {endpoint} returned {resp.status_code}")
    except requests.exceptions.Timeout:
        logger.warning(f"API GET {endpoint} timed out")
    except requests.exceptions.ConnectionError:
        logger.warning(f"API GET {endpoint} connection refused")
    except Exception as e:
        logger.error(f"API GET {endpoint} error: {e}")
    return None

def api_post(endpoint, data, timeout=8):
    """Make POST request to API with error handling"""
    try:
        resp = requests.post(f"{API_URL}{endpoint}", json=data, timeout=timeout)
        try:
            body = resp.json()
        except ValueError:
            body = None
        # Xato bo'lsa ham server xabarini qaytaramiz (masalan "qoldiq yetarli emas")
        return resp.ok, body
    except requests.exceptions.Timeout:
        logger.warning(f"API POST {endpoint} timed out")
    except Exception as e:
        logger.error(f"API POST {endpoint} error: {e}")
    return False, None

def get_active_shops():
    """Get all active shops via public API"""
    now = time.time()
    if shop_cache["data"] and now - shop_cache["timestamp"] < shop_cache["ttl"]:
        return shop_cache["data"]
    
    result = api_get("/telegram/shops")
    if result and result.get("success") and result.get("data"):
        shops = result["data"]
        shop_cache["data"] = shops
        shop_cache["timestamp"] = now
        logger.info(f"Loaded {len(shops)} shops")
        return shops
    
    logger.warning("No shops from API")
    return []

def get_shop_products(owner_id):
    """Get products for a specific shop via public API"""
    now = time.time()
    key = f"products_{owner_id}"
    if key in product_cache and now - product_cache[key]["timestamp"] < 30:
        return product_cache[key]["data"]
    
    result = api_get(f"/telegram/products/{owner_id}")
    if result and result.get("success") and result.get("data"):
        products = result["data"]
        product_cache[key] = {"data": products, "timestamp": now}
        return products
    
    product_cache[key] = {"data": [], "timestamp": now}
    return []

def preload_all_shop_products():
    """Preload products for ALL shops to show counts in shop list"""
    shops = get_active_shops()
    result = []
    for shop in shops:
        sid = shop.get("_id")
        prods = get_shop_products(sid)
        shop["_product_count"] = len(prods)
        shop["_has_products"] = len(prods) > 0
        result.append(shop)
    return result

def format_price(amount):
    return f"{amount:,}".replace(",", " ") + " so'm"

user_states = {}

# === COMMAND HANDLERS ===

# === PERSISTENT KEYBOARD ===
def get_main_keyboard():
    """Return the persistent ReplyKeyboardMarkup"""
    buttons = [
        ["🏪 Do'konlar", "ℹ️ Yordam"],
        ["☎️ Aloqa"],
    ]
    return ReplyKeyboardMarkup(buttons, resize_keyboard=True, input_field_placeholder="Menyudan tanlang...")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show store list to customer"""
    user = update.effective_user
    shops = get_active_shops()

    # Set persistent keyboard
    await update.message.reply_text(
        "Xush kelibsiz! 🛍️",
        reply_markup=get_main_keyboard()
    )

    if not shops:
        await update.message.reply_text(
            f"Assalomu alaykum, {user.first_name}! 🛍️\n\n"
            f"OsonBiznes do'konlar botiga xush kelibsiz!\n\n"
            f"Hozircha faol do'konlar mavjud emas.\n"
            f"Keyinroq qayta urinib ko'ring yoki /refresh ni bosing."
        )
        return

    # Preload products to show counts
    shops_with_products = preload_all_shop_products()
    total_products = sum(s.get("_product_count", 0) for s in shops_with_products)

    text = (
        f"Assalomu alaykum, {user.first_name}! 🛍️\n\n"
        f"📊 {len(shops)} ta do'kon, {total_products} ta mahsulot\n"
        f"Kerakli do'konni tanlang:\n\n"
    )

    keyboard = []
    for shop in shops_with_products[:10]:
        biz = shop.get("business", shop.get("name", "Do'kon"))
        pcount = shop.get("_product_count", 0)
        if pcount > 0:
            btn_text = f"🏪 {biz}  ({pcount} ta mahsulot)"
        else:
            btn_text = f"🏪 {biz}"
        keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"shop_{shop['_id']}")])

    keyboard.append([InlineKeyboardButton("🔄 Yangilash", callback_data="refresh_shops")])

    await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

async def refresh(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Refresh shops list"""
    shop_cache["data"] = None
    await start(update, context)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help information"""
    text = (
        "ℹ️ **OsonBiznes Bot - Yordam**\n\n"
        "Bu bot orqali siz barcha do'konlarni ko'rib, mahsulotlarni qidirib, buyurtma berishingiz mumkin.\n\n"
        "🟢 **Mavjud buyruqlar:**\n"
        "▶ /start - Do'konlar ro'yxatini ko'rish\n"
        "▶ /shops - Do'konlar ro'yxati\n"
        "▶ /help - Yordam\n"
        "▶ /aloqa - Admin bilan bog'lanish\n"
        "▶ /refresh - Do'konlarni yangilash\n\n"
        "🟢 **Buyurtma berish:**\n"
        "1. Do'konni tanlang\n"
        "2. Mahsulotni tanlang\n"
        "3. Ismingiz, telefon va manzilni kiriting\n"
        "4. Yetkazib berish usulini tanlang\n"
        "5. Tasdiqlang!\n\n"
        "🟢 **Pastdagi tugmalar:**\n"
        "🏪 Do'konlar - Barcha do'konlar ro'yxati\n"
        "ℹ️ Yordam - Ushbu yordam xabari\n"
        "☎️ Aloqa - Admin bilan bog'lanish"
    )
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=get_main_keyboard())

async def aloqa_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show contact information"""
    text = (
        "☎️ **Admin bilan bog'lanish:**\n\n"
        "Agar biron muammo yuzaga kelsa, quyidagi kanallar orqali biz bilan bog'lanishingiz mumkin:\n\n"
        "📢 Telegram kanal: @OsonBiznesUz\n"
        "💬 Telegram guruh: @OsonBiznesSupport\n"
        "🤝 Bot: @OSSON_BIZNES_BOT\n\n"
        "Ish vaqti: Soat 09:00 - 22:00\n"
        "☎️ Yoki quyidagi tugmani bosing va xabar qoldiring!"
    )
async def mahsulotlar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show products or store catalog"""
    await start(update, context)

async def buyurtmalarim_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show order tracking information"""
    text = (
        "📦 **Mening Buyurtmalarim:**\n\n"
        "Buyurtmalaringiz holatini bilish uchun buyurtma paytida kiritgan telefon raqamingiz orqali do'kon bilan bog'lanishingiz yoki veb-saytdan tekshirishingiz mumkin.\n\n"
        "🌐 Veb-sayt: [OsonBiznes.uz](https://osonbiznes.uz)\n"
        "☎️ Qo'llab-quvvatlash: @OsonBiznesSupport"
    )
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=get_main_keyboard())

async def kabinet_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user cabinet & platform links"""
    chat_id = update.effective_chat.id
    user = update.effective_user
    name = user.first_name if user else "Foydalanuvchi"
    text = (
        f"👤 **Shaxsiy Kabinet - {name}**\n\n"
        f"🆔 Telegram ID: `{chat_id}`\n"
        f"🏪 OsonBiznes Marketplace: [OsonBozor](https://osonbiznes.uz/marketplace)\n\n"
        f"Do'koningizni platformada ochish va mahsulotlaringizni bot orqali sotish uchun [OsonBiznes.uz](https://osonbiznes.uz) da ro'yxatdan o'ting!"
    )
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=get_main_keyboard())

# === CALLBACK HANDLER ===
async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "back_shops":
        await show_shop_list(query)
        return

    if data == "refresh_shops":
        shop_cache["data"] = None
        product_cache.clear()
        shops_with_products = preload_all_shop_products()
        if not shops_with_products:
            await query.edit_message_text("Do'konlar topilmadi. Server ishlayotganini tekshiring.")
            return
        total_products = sum(s.get("_product_count", 0) for s in shops_with_products)
        text = f"Do'konlar yangilandi! ({len(shops_with_products)} ta, {total_products} ta mahsulot):\n\n"
        keyboard = []
        for shop in shops_with_products[:10]:
            biz = shop.get("business", shop.get("name", "Do'kon"))
            pcount = shop.get("_product_count", 0)
            if pcount > 0:
                btn_text = f"🏪 {biz}  ({pcount} ta mahsulot)"
            else:
                btn_text = f"🏪 {biz}"
            keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"shop_{shop['_id']}")])
        keyboard.append([InlineKeyboardButton("🔄 Yangilash", callback_data="refresh_shops")])
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        return

    if data.startswith("shop_"):
        shop_id = data.replace("shop_", "")
        shops = get_active_shops()
        shop = next((s for s in shops if s.get("_id") == shop_id), None)

        if not shop:
            await query.message.reply_text("Do'kon topilmadi")
            return

        biz_name = shop.get("business", shop.get("name", "Do'kon"))
        context.user_data["current_shop"] = shop_id

        # Get products via public API
        products = get_shop_products(shop_id)

        if products:
            text = f"🏪 {biz_name}\n{len(products)} ta mahsulot\n\nMahsulotni tanlang:"
            keyboard = []
            for p in products[:10]:
                stock_info = ""
                if p.get("stock", 0) <= 0:
                    stock_info = " ❌"
                elif p.get("stock", 0) < 5:
                    stock_info = " ⚠️"
                btn_text = f"{p['name']} - {format_price(p['price'])}{stock_info}"
                keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"prod_{p['_id']}")])
            keyboard.append([InlineKeyboardButton("🛍️ Boshqa mahsulot", callback_data=f"order_shop_{shop_id}")])
            keyboard.append([InlineKeyboardButton("🔙 Do'konlar ro'yxati", callback_data="back_shops")])
        else:
            text = (
                f"🏪 {biz_name}\n\n"
                f"Hozircha mahsulotlar mavjud emas.\n"
                f"Agar xohlasangiz, buyurtma berishingiz mumkin:"
            )
            keyboard = [
                [InlineKeyboardButton("🛍️ Buyurtma berish", callback_data=f"order_shop_{shop_id}")],
                [InlineKeyboardButton("🔙 Do'konlar ro'yxati", callback_data="back_shops")],
            ]
        
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        return

    # Show product detail
    if data.startswith("prod_"):
        product_id = data.replace("prod_", "")
        products_data = product_cache.get(f"prod_detail_{product_id}")
        
        # Try to get product from any shop's cache
        found_product = None
        for key, cache in product_cache.items():
            if key.startswith("products_") and isinstance(cache, dict) and cache.get("data"):
                for p in cache["data"]:
                    if str(p.get("_id")) == product_id:
                        found_product = p
                        break
            if found_product:
                break
        
        if not found_product:
            # Fetch single product via API
            shops = get_active_shops()
            for shop in shops:
                prods = get_shop_products(shop["_id"])
                for p in prods:
                    if str(p["_id"]) == product_id:
                        found_product = p
                        break
                if found_product:
                    break
        
        if found_product:
            shop_name = "Do'kon"
            for shop in get_active_shops():
                if str(shop["_id"]) == str(found_product.get("userId")):
                    shop_name = shop.get("business", "Do'kon")
                    break
            
            text = (
                f"📦 {found_product['name']}\n"
                f"🏪 {shop_name}\n\n"
                f"💰 Narxi: {format_price(found_product['price'])}\n"
                f"📊 Qoldiq: {found_product.get('stock', 0)} ta\n"
                f"📁 Kategoriya: {found_product.get('category', 'Boshqa')}\n"
            )
            keyboard = [
                [InlineKeyboardButton("🛒 Buyurtma berish", callback_data=f"order_prod_{product_id}")],
                [InlineKeyboardButton("🔙 Orqaga", callback_data=f"shop_{found_product.get('userId')}")],
                [InlineKeyboardButton("🏪 Barcha do'konlar", callback_data="back_shops")],
            ]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        else:
            await query.message.reply_text("Mahsulot topilmadi")
        return

    # Order a specific product
    if data.startswith("order_prod_"):
        product_id = data.replace("order_prod_", "")
        chat_id = query.message.chat_id
        # Find the product's shop ID from cache
        shop_id = None
        for key, cache in product_cache.items():
            if key.startswith("products_") and isinstance(cache, dict) and cache.get("data"):
                for p in cache["data"]:
                    if str(p.get("_id")) == product_id:
                        shop_id = str(p.get("userId"))
                        break
            if shop_id:
                break
        user_states[chat_id] = {"step": "name", "product_id": product_id, "shop_id": shop_id}
        await query.message.reply_text(
            "Buyurtma berish uchun ismingizni kiriting:"
        )
        return

    # Manual order for a shop (no specific product)
    if data.startswith("order_shop_"):
        shop_id = data.replace("order_shop_", "")
        chat_id = query.message.chat_id
        user_states[chat_id] = {"step": "product_name", "shop_id": shop_id}
        await query.message.reply_text(
            "Buyurtma berish uchun mahsulot nomini yozing:"
        )
        return

    # Skip address (user will pick up from store)
    if data == "skip_address":
        chat_id = query.message.chat_id
        if chat_id in user_states:
            state = user_states[chat_id]
            state["address"] = "Do'kondan olaman"
            state["step"] = "delivery"
            # Don't edit the callback message, just send a new one
            # Ask for delivery method
            keyboard = [
                [InlineKeyboardButton("🏠 Do'kondan olib ketish", callback_data="delivery_pickup")],
                [InlineKeyboardButton("🚚 Yetkazib berish", callback_data="delivery_delivery")],
            ]
            await query.message.reply_text(
                "Mahsulotni qanday olishni xohlaysiz?",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
        return

    # Delivery method selection
    if data.startswith("delivery_"):
        method = data.replace("delivery_", "")
        chat_id = query.message.chat_id
        method = data.replace("delivery_", "")
        chat_id = query.message.chat_id
        if chat_id not in user_states:
            await query.message.reply_text("Buyurtma jarayoni tugagan. Qaytadan /start bosing.")
            return
        state = user_states[chat_id]
        state["delivery_method"] = method
        state["step"] = "confirm"
        
        # Show order summary
        prod_name = state.get("product_name", "Mahsulot")
        price_text = ""
        if state.get("product_id"):
            for key, cache in product_cache.items():
                if key.startswith("products_") and isinstance(cache, dict) and cache.get("data"):
                    for p in cache["data"]:
                        if str(p.get("_id")) == state["product_id"]:
                            price_text = f"\n💰 {format_price(p['price'])}"
                            break
                    break
        
        delivery_text = "🏠 Olib ketish" if method == "pickup" else "🚚 Yetkazib berish"
        address_text = f"\n📍 {state.get('address', 'Ko\'rsatilmagan')}" if method == "delivery" and state.get("address") else ""
        
        msg = (
            f"📋 Buyurtma ma'lumotlari:\n\n"
            f"📦 {prod_name}{price_text}\n"
            f"👤 {state.get('name', 'Noma\'lum')}\n"
            f"📞 {state.get('phone', 'Noma\'lum')}\n"
            f"{delivery_text}{address_text}\n\n"
            f"Tasdiqlaysizmi?"
        )
        keyboard = [
            [InlineKeyboardButton("✅ Tasdiqlash", callback_data="confirm_order")],
            [InlineKeyboardButton("❌ Bekor qilish", callback_data="cancel_order")],
        ]
        await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
        return

async def show_shop_list(query):
    """Show the shop list to the user"""
    shops_with_products = preload_all_shop_products()
    if not shops_with_products:
        await query.edit_message_text("Do'konlar mavjud emas")
        return
    total_products = sum(s.get("_product_count", 0) for s in shops_with_products)
    text = f"Barcha do'konlar ({len(shops_with_products)} ta, {total_products} ta mahsulot):\n\n"
    keyboard = []
    for shop in shops_with_products[:10]:
        biz = shop.get("business", shop.get("name", "Do'kon"))
        pcount = shop.get("_product_count", 0)
        if pcount > 0:
            btn_text = f"🏪 {biz}  ({pcount} ta mahsulot)"
        else:
            btn_text = f"🏪 {biz}"
        keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"shop_{shop['_id']}")])
    keyboard.append([InlineKeyboardButton("🔄 Yangilash", callback_data="refresh_shops")])
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

# === TEXT HANDLER ===
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text.strip()
    lowered = text.lower().strip()

    # ====== PERSISTENT KEYBOARD HANDLERS (check BEFORE order flow) ======
    if any(k in lowered for k in ["do'konlar", "dokonlar", "magazinlar", "navbat", "sartarosh", "xizmat", "kabinet", "salon", "usta", "fade", "soqol"]):
        user_states.pop(chat_id, None)  # Clear any active order
        await start(update, context)
        return
    if lowered in ["ℹ️ yordam", "yordam", "help", "y", "/help", "/yordam"]:
        user_states.pop(chat_id, None)
        await help_command(update, context)
        return
    if lowered in ["☎️ aloqa", "aloqa", "contact", "admin", "a", "/aloqa", "/contact"]:
        user_states.pop(chat_id, None)
        await aloqa_command(update, context)
        return

    # Check if user is in order flow
    if chat_id in user_states:
        state = user_states[chat_id]
        step = state.get("step")

        if step == "product_name":
            state["product_name"] = text
            state["step"] = "name"
            await update.message.reply_text(f"Mahsulot: {text}\n\nEndi ismingizni kiriting:")
            return

        if step == "name":
            state["name"] = text
            state["step"] = "phone"
            await update.message.reply_text("Telefon raqamingizni kiriting:\n(masalan: +998 90 123 45 67)")
            return

        if step == "phone":
            state["phone"] = text
            state["step"] = "address"
            keyboard = [
                [InlineKeyboardButton("🏠 Do'kondan olaman", callback_data="skip_address")],
            ]
            await update.message.reply_text(
                "Manzilingizni kiriting:\n(masalan: Toshkent sh., Chilonzor t., 12-uy)\n\n"
                "Agar do'kondan olib ketmoqchi bo'lsangiz, pastdagi tugmani bosing 👇",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return

        if step == "address":
            state["address"] = text
            state["step"] = "delivery"
            # Ask for delivery method
            keyboard = [
                [InlineKeyboardButton("🏠 Do'kondan olib ketish", callback_data="delivery_pickup")],
                [InlineKeyboardButton("🚚 Yetkazib berish", callback_data="delivery_delivery")],
            ]
            await update.message.reply_text(
                "Mahsulotni qanday olishni xohlaysiz?",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return

        if step == "confirm":
            state["confirm"] = text
            # Process the order via public API
            product_name = state.get("product_name", "Mahsulot")
            
            ok, result = api_post("/telegram/order", {
                "customer": state.get("name", "Telegram mijoz"),
                "phone": state.get("phone", ""),
                "items": [{"name": product_name, "qty": 1, "price": 0}],
                "total": 0,
                "source": "telegram",
                "ownerId": state.get("shop_id"),
            }, timeout=10)
            
            msg = f"✅ Buyurtma qabul qilindi!\n\n📦 {product_name}\n👤 {state.get('name', 'Noma\'lum')}\n📞 {state.get('phone', 'Noma\'lum')}\n\nDo'kon egasi tez orada siz bilan bog'lanadi! 🙏"
            await update.message.reply_text(msg)
            
            user_states.pop(chat_id, None)
            return

    # If none matched, show shops with the persistent keyboard still visible
    await start(update, context)

# === CALLBACK for order confirmation ===
async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Separate handler for order confirm/cancel callbacks"""
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "confirm_order":
        chat_id = query.message.chat_id
        state = user_states.pop(chat_id, {})

        name = state.get("name", "Noma'lum")
        phone = state.get("phone", "Noma'lum")
        address = state.get("address", "")
        delivery_method = state.get("delivery_method", "")
        product_name = state.get("product_name", "")
        product_id = state.get("product_id", "")
        # Get shop ID from state, with fallback to current_shop from context
        shop_id = state.get("shop_id", None)
        if not shop_id or shop_id == "None":
            shop_id = context.user_data.get("current_shop", None)

        # Try to get product name from ID
        if product_id and not product_name:
            for key, cache in product_cache.items():
                if key.startswith("products_") and isinstance(cache, dict) and cache.get("data"):
                    for p in cache["data"]:
                        if str(p.get("_id")) == product_id:
                            product_name = p["name"]
                            break
                if product_name:
                    break

        if not product_name:
            product_name = "Mahsulot"

        # Find product price if known
        price = 0
        for key, cache in product_cache.items():
            if key.startswith("products_") and isinstance(cache, dict) and cache.get("data"):
                for p in cache["data"]:
                    if p.get("name") == product_name or str(p.get("_id")) == product_id:
                        price = p.get("price", 0)
                        break

        if not shop_id or shop_id == "None":
            await query.edit_message_text("⚠️ Do'kon aniqlanmadi. /start bosib, do'konni qaytadan tanlang.")
            return

        # Narx serverda hisoblanadi — biz faqat mahsulot va miqdorni yuboramiz
        items = [{"name": product_name, "qty": 1}]
        if product_id:
            items[0]["productId"] = product_id  # For precise stock deduction
        order_data = {
            "customer": name,
            "phone": phone,
            "items": items,
            "source": "telegram",
            "ownerId": shop_id,
            "address": address,
            "deliveryMethod": delivery_method,
        }
        # Sinxron HTTP so'rovni alohida thread'da — bot event loop'i bloklanmaydi
        ok, result = await asyncio.to_thread(api_post, "/telegram/order", order_data, 10)
        if not ok:
            reason = (result or {}).get("message") or "Server bilan bog'lanib bo'lmadi"
            await query.edit_message_text(f"❌ Buyurtma qabul qilinmadi: {reason}\n\nQaytadan urinib ko'ring: /start")
            return
        server_total = ((result or {}).get("data") or {}).get("total")
        if server_total is not None:
            price = server_total
        order_no = ((result or {}).get("data") or {}).get("orderNumber", "")

        delivery_text = ""
        if delivery_method == "pickup":
            delivery_text = "🏠 Olib ketish"
        elif delivery_method == "delivery":
            delivery_text = f"🚚 Yetkazib berish\n📍 {address}" if address else "🚚 Yetkazib berish"

        msg = (
            f"✅ Buyurtma qabul qilindi! 🎉 {order_no}\n\n"
            f"📦 {product_name}\n"
            f"💰 {format_price(price) if price else 'Narx kelishiladi'}\n"
            f"👤 {name}\n"
            f"📞 {phone}\n"
            f"{delivery_text}\n\n"
            f"Do'kon egasi tez orada siz bilan bog'lanadi.\n"
            f"Rahmat! 🙏"
        )
        await query.edit_message_text(msg)
        return

    if data == "cancel_order":
        chat_id = query.message.chat_id
        user_states.pop(chat_id, None)
        await query.edit_message_text("Buyurtma bekor qilindi")
        return

# === MAIN ===
def main():
    if not TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        print("Bot token topilmadi! .env faylini tekshiring.")
        return

    try:
        application = Application.builder().token(TOKEN).build()

        # Command handlers
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("refresh", refresh))
        application.add_handler(CommandHandler("shops", start))
        application.add_handler(CommandHandler(["mahsulotlar", "katalog", "products"], mahsulotlar_command))
        application.add_handler(CommandHandler(["buyurtmalarim", "buyurtma", "orders"], buyurtmalarim_command))
        application.add_handler(CommandHandler(["kabinet", "profil", "account"], kabinet_command))
        application.add_handler(CommandHandler(["help", "yordam"], help_command))
        application.add_handler(CommandHandler(["aloqa", "contact"], aloqa_command))

        # Callback handler - first handle order confirmations
        application.add_handler(CallbackQueryHandler(callback_handler, pattern="^(confirm_order|cancel_order)$"))
        # Then handle all other callbacks
        application.add_handler(CallbackQueryHandler(handle_callback))

        # Text handler
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

        print(f"""
🤖 OsonBiznes Multi-Store Bot
   Bot: https://t.me/OSSON_BIZNES_BOT
   Mode: API-based (compatible with all backends)
   Status: Running!
        """)

        application.run_polling(allowed_updates=Update.ALL_TYPES)

    except Exception as e:
        logger.error(f"Bot start error: {e}")
        print(f"Bot ishga tushmadi: {e}")

if __name__ == "__main__":
    main()
