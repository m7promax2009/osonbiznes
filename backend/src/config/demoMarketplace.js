// DEV/DEMO: OsonBozor'ni rasmli mahsulotlar va bir nechta do'konlar bilan to'ldiradi.
// Rasmlar backend/demo-assets/ da (scripts/fetch-demo-catalog.js), /uploads/demo/ orqali beriladi.
// Production'da faqat SEED_DEMO=true bo'lsa ishlaydi (seedDemoData ichidan chaqiriladi).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CATALOG_FILE = path.join(
  __dirname,
  "..",
  "..",
  "demo-assets",
  "catalog.json",
);
const USD_UZS = 12700;

const SHOPS = [
  {
    key: "malika",
    email: "malika.mobile@demo.osonbiznes.uz",
    name: "Jasur Rahimov",
    business: "Malika Mobile",
    phone: "+998901112233",
    city: "Toshkent",
    address: "Malika savdo majmuasi, 2-qavat, 214-do'kon",
    lat: 41.3536,
    lng: 69.2386,
    description:
      "Original smartfon va planshetlar. Rasmiy kafolat, eski telefonni almashtirish (trade-in) mumkin.",
    cats: ["Smartfonlar", "Planshetlar"],
    featured: true,
  },
  {
    key: "techno",
    email: "technopoint@demo.osonbiznes.uz",
    name: "Dilshod Karimov",
    business: "TechnoPoint",
    phone: "+998935554411",
    city: "Toshkent",
    address: "Chilonzor, Bunyodkor ko'chasi 7",
    lat: 41.2858,
    lng: 69.2042,
    description:
      "Noutbuklar, quloqchinlar va aksessuarlar. Ofis va o'qish uchun tayyor to'plamlar.",
    cats: ["Noutbuklar", "Aksessuarlar"],
    featured: true,
  },
  {
    key: "soat",
    email: "soat.olami@demo.osonbiznes.uz",
    name: "Farrux Umarov",
    business: "Soat Olami",
    phone: "+998977001020",
    city: "Toshkent",
    address: "Mirobod, Amir Temur shoh ko'chasi 24",
    lat: 41.3016,
    lng: 69.2794,
    description:
      "Erkaklar va ayollar soatlari, quyoshdan saqlovchi ko'zoynaklar. Sovg'abop qadoqlash bepul.",
    cats: ["Soatlar", "Ko'zoynaklar"],
    featured: true,
  },
  {
    key: "atir",
    email: "atir.uyi@demo.osonbiznes.uz",
    name: "Madina Yusupova",
    business: "Atir Uyi",
    phone: "+998998887766",
    city: "Toshkent",
    address: "Shayxontohur, Navoiy ko'chasi 30",
    lat: 41.3264,
    lng: 69.2397,
    description:
      "Original atirlar — tester bilan tanlab olasiz. Toshkent bo'ylab yetkazib berish.",
    cats: ["Parfyumeriya"],
    featured: false,
  },
  {
    key: "step",
    email: "step.store@demo.osonbiznes.uz",
    name: "Kamola Ergasheva",
    business: "Step Store",
    phone: "+998946543210",
    city: "Samarqand",
    address: "Registon ko'chasi 12",
    lat: 39.6542,
    lng: 66.9597,
    description: "Krossovkalar va sumkalar. Har hafta yangi kolleksiya.",
    cats: ["Poyabzal", "Sumkalar"],
    featured: false,
  },
];

// Mavjud demo do'konlar mahsulotlariga mos rasm
const LEGACY_IMAGE_MATCH = {
  "iPhone 15 Pro 128GB": "iPhone 13 Pro",
  "Samsung Galaxy A55": "Samsung Galaxy S8",
  "Xiaomi Redmi Note 13": "Realme XT",
  "AirPods Pro 2": "Apple Airpods",
  "MacBook Air M3": "Apple MacBook Pro 14 Inch Space Grey",
  "Samsung Galaxy S24 Ultra": "Samsung Galaxy S7",
  'iPad Pro M4 11"': "iPad Mini 2021 Starlight",
  "AirPods Max": "Apple AirPods Max Silver",
  "Samsung Galaxy Watch 7": "Apple Watch Series 4 Gold",
  "JBL Tune 770NC": "Beats Flex Wireless Earphones",
};

const DESCRIPTIONS = {
  Smartfonlar:
    "Original, qutisi va hujjatlari bilan. 12 oy kafolat. Do'kondan olib ketish yoki yetkazib berish.",
  Planshetlar: "O'qish, ish va film uchun. Original, kafolat bilan.",
  Noutbuklar:
    "Windows/macOS o'rnatilgan holda topshiriladi. Kafolat va bepul sozlab berish.",
  Aksessuarlar:
    "Original aksessuar. Telefon va noutbukingizga mos kelishini tekshirib beramiz.",
  Soatlar: "Sovg'abop qadoqda. Bilakka moslab berish bepul.",
  Parfyumeriya:
    "Original atir. Do'konda tester bilan sinab ko'rishingiz mumkin.",
  Poyabzal:
    "Barcha o'lchamlar mavjud. O'lcham to'g'ri kelmasa, almashtirib beramiz.",
  Sumkalar: "Sifatli material, kundalik va bayramona uslublar.",
  "Ko'zoynaklar": "UV400 himoya. G'ilofi bilan.",
};

const uzs = (usd) => Math.max(50, Math.round((usd * USD_UZS) / 1000)) * 1000;

async function seedMarketplaceDemo() {
  if (!fs.existsSync(CATALOG_FILE)) {
    console.warn(
      "  ⚠️ demo-assets/catalog.json yo'q — node scripts/fetch-demo-catalog.js",
    );
    return;
  }
  const User = require("../models/User");
  const Product = require("../models/Product");
  const ShopProfile = require("../models/ShopProfile");
  const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
  const byName = new Map(catalog.map((c) => [c.name, c]));

  // Eski demo mahsulotlarga rasm
  for (const [prod, src] of Object.entries(LEGACY_IMAGE_MATCH)) {
    const c = byName.get(src);
    if (c)
      await Product.updateMany(
        { name: prod, images: { $size: 0 } },
        { $set: { images: c.images } },
      );
  }

  const seen = new Set();
  let total = 0;
  for (const [si, shop] of SHOPS.entries()) {
    if (await User.exists({ email: shop.email })) continue;
    const user = await User.create({
      name: shop.name,
      email: shop.email,
      password: crypto.randomBytes(18).toString("base64url"), // demo do'kon — login uchun emas
      business: shop.business,
      phone: shop.phone,
      role: "shop_owner",
      tariff: "pro",
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      emailVerified: true,
    });
    const items = catalog.filter(
      (c) => shop.cats.includes(c.category) && !seen.has(c.name),
    );
    items.forEach((c) => seen.add(c.name));
    const docs = items.map((c, i) => {
      const price = uzs(c.usd);
      return {
        userId: user._id,
        name: c.name,
        category: c.category,
        price,
        cost: Math.round((price * 0.78) / 1000) * 1000,
        stock: ((i * 7 + si * 3) % 14) + 1,
        sku: `${shop.key.toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
        description: `${c.brand ? c.brand + ". " : ""}${DESCRIPTIONS[c.category] || ""}`,
        images: c.images,
        isActive: true,
      };
    });
    await Product.insertMany(docs);
    total += docs.length;
    await User.updateOne(
      { _id: user._id },
      { $set: { totalProducts: docs.length } },
    );
    await ShopProfile.create({
      userId: user._id,
      description: shop.description,
      address: shop.address,
      city: shop.city,
      latitude: shop.lat,
      longitude: shop.lng,
      showOnMarketplace: true,
      isFeatured: shop.featured,
      isVerified: true,
      categories: shop.cats,
      productCount: docs.length,
    });
  }
  if (total)
    console.log(
      `  ✅ OsonBozor demo: ${SHOPS.length} do'kon, ${total} ta rasmli mahsulot`,
    );
}

module.exports = { seedMarketplaceDemo };
