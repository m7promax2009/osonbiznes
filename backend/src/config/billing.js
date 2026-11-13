// Tarif narxlari va to'lov rekvizitlari — yagona manba (frontend ham shu qiymatlarni GET /subscription orqali oladi).

const TARIFF_PRICES = {
  start: 99000,
  pro: 199000,
  business: 499000,
};

// Yillik to'lov: 12 oy narxi -20% (Subscription.jsx dagi "-20%" bilan mos)
const TARIFF_YEARLY_PRICES = {
  start: 948000,
  pro: 1908000,
  business: 4788000,
};

const TARIFF_LABELS = {
  start: "Start",
  pro: "Pro",
  business: "Biznes",
};

function getPlanPrice(tariff, billingCycle = "monthly") {
  if (billingCycle === "yearly") {
    return { amount: TARIFF_YEARLY_PRICES[tariff], durationDays: 365 };
  }
  return { amount: TARIFF_PRICES[tariff], durationDays: 30 };
}

// Qabul qiluvchi karta HECH QACHON kodga yozilmaydi — faqat env orqali:
//   PAYMENT_CARD_NUMBER=8600 1234 5678 9012
//   PAYMENT_CARD_HOLDER=ISM FAMILIYA
//   PAYMENT_CARD_BANK=Kapitalbank
function getPaymentDetails() {
  const card = (process.env.PAYMENT_CARD_NUMBER || "").trim();
  if (!card) return null;
  return {
    card,
    holder: (process.env.PAYMENT_CARD_HOLDER || "").trim(),
    bank: (process.env.PAYMENT_CARD_BANK || "").trim(),
  };
}

// Ommaviy tarif tavsifi (sotuv agenti va landing uchun). Subscription.jsx dagi ro'yxat bilan mos bo'lishi SHART.
const PLAN_FEATURES = {
  start: [
    "500 tagacha mahsulot",
    "300 tagacha mijoz",
    "Telegram bot ulash",
    "Asosiy hisobotlar",
    "Email yordam",
  ],
  pro: [
    "Cheksiz mahsulot va mijozlar",
    "Nasiya daftari (qarzlar CRM)",
    "Kassa (POS) va chek",
    "Telegram bot + biznes maslahatchi",
    "To'liq hisobotlar",
    "Ustuvor yordam",
  ],
  business: [
    "Barcha Pro imkoniyatlari",
    "Ustuvor shaxsiy yordam",
    "Yangi imkoniyatlarga birinchi bo'lib kirish",
  ],
};

function getPublicPlans() {
  return {
    trialDays: 14,
    currency: "UZS",
    plans: Object.keys(TARIFF_PRICES).map((key) => ({
      key,
      name: TARIFF_LABELS[key],
      monthly: TARIFF_PRICES[key],
      yearly: TARIFF_YEARLY_PRICES[key],
      features: PLAN_FEATURES[key],
    })),
  };
}

module.exports = {
  getPublicPlans,
  TARIFF_PRICES,
  TARIFF_YEARLY_PRICES,
  TARIFF_LABELS,
  getPlanPrice,
  getPaymentDetails,
};
