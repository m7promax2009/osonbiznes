const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");
const {
  TARIFF_PRICES,
  TARIFF_LABELS,
  getPlanPrice,
  getPaymentDetails,
  getPublicPlans,
} = require("../config/billing");

// Obuna to'lovi oqimi (Click/Payme merchant ulanmaguncha):
//   1) Do'kon egasi ko'rsatilgan kartaga o'tkazma qiladi va izohga REFERENS kodini yozadi
//   2) POST /request — "pending" to'lov yaratiladi, admin xabardor qilinadi
//   3) Admin pulni o'z kartasida ko'rib, /api/admin/payments/:id/approve orqali tasdiqlaydi
// Foydalanuvchi o'zi tarifni faollashtira OLMAYDI — bu yagona ishonchli yo'l.

const MAX_PENDING = 3;

// GET /api/subscription/plans - Public: tariflar (landing va AI sotuv agenti uchun)
router.get("/plans", (req, res) => {
  res.json({ success: true, data: getPublicPlans() });
});

// GET /api/subscription - Joriy obuna holati + to'lov rekvizitlari
router.get("/", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });

    const pending = await Payment.findOne({
      userId: user._id,
      status: "pending",
      type: "subscription",
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        tariff: user.tariff,
        tariffStatus: user.tariffStatus,
        trialDaysLeft: user.trialDaysLeft,
        trialEndsAt: user.trialEndsAt,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        paymentMethod: user.paymentMethod,
        prices: TARIFF_PRICES,
        paymentDetails: getPaymentDetails(),
        pendingPayment: pending
          ? {
              id: pending._id,
              tariff: pending.tariff,
              amount: pending.amount,
              reference: pending.transactionId,
              createdAt: pending.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Subscription GET error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// POST /api/subscription/request - O'tkazma qilinganini bildirish (admin tasdig'ini kutadi)
router.post("/request", authenticate, async (req, res) => {
  try {
    const {
      tariff,
      billingCycle = "monthly",
      payerCardLast4 = "",
      note = "",
    } = req.body;

    if (!TARIFF_PRICES[tariff]) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri tarif" });
    }
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri to'lov davri" });
    }
    const last4 = String(payerCardLast4).replace(/\D/g, "");
    // Majburiy: admin o'z kartasidagi kirimni shu raqam + summa bo'yicha moslashtiradi
    if (last4.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Kartaning faqat oxirgi 4 raqamini kiriting",
      });
    }

    if (req.user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        requireEmailVerification: true,
        message: "Avval emailingizni tasdiqlang (Sozlamalar yoki yuqoridagi banner orqali)",
      });
    }

    const pendingCount = await Payment.countDocuments({
      userId: req.user.id,
      status: "pending",
      type: "subscription",
    });
    if (pendingCount >= MAX_PENDING) {
      return res.status(429).json({
        success: false,
        message:
          "Sizda tekshirilayotgan to'lovlar bor. Admin tasdiqlashini kuting.",
      });
    }

    const { amount, durationDays } = getPlanPrice(tariff, billingCycle);
    const reference = `OB-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const payment = await Payment.create({
      userId: req.user.id,
      amount,
      method: "transfer",
      type: "subscription",
      tariff,
      status: "pending",
      transactionId: reference,
      description: `${TARIFF_LABELS[tariff]} tarifi, ${billingCycle === "yearly" ? "1 yil" : "1 oy"} (${amount.toLocaleString()} so'm)`,
      metadata: {
        billingCycle,
        durationDays,
        payerCardLast4: last4,
        note: String(note).slice(0, 200),
      },
    });

    try {
      const admin = await User.findOne({ role: "admin" }).select("_id").lean();
      if (admin) {
        await Notification.send({
          userId: admin._id,
          type: "admin_message",
          title: "Yangi obuna to'lovi tekshiruvda 💳",
          message:
            `${req.user.name} (${req.user.business || req.user.email}) — ${amount.toLocaleString()} so'm, ${TARIFF_LABELS[tariff]}. Referens: ${reference}${last4 ? `, karta *${last4}` : ""}`.slice(
              0,
              500,
            ),
          data: {
            paymentId: payment._id.toString(),
            userId: String(req.user.id),
            amount,
            tariff,
            reference,
          },
          urgent: true,
        });
      }
    } catch (err) {
      console.error("Admin notify error:", err.message);
    }

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        amount,
        tariff,
        reference,
        status: "pending",
        message:
          "So'rov qabul qilindi. Admin to'lovni tekshirgach tarif avtomatik faollashadi.",
      },
    });
  } catch (error) {
    console.error("Subscription request error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// GET /api/subscription/payments - To'lovlar tarixi
router.get("/payments", authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

module.exports = router;
