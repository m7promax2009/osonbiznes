const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const { signToken } = require("../config/jwt");
const { rateLimit } = require("../middleware/rateLimit");
const { normalizePhone } = require("../services/phone");
const { checkPassword } = require("../services/passwordPolicy");
const {
  issueCode,
  consumeCode,
  CooldownError,
} = require("../services/authCodes");
const { MailNotConfiguredError } = require("../services/mailer");

// Login brute-force himoyasi: IP'dan 15 daqiqada 30 urinish
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
});
// Ro'yxatdan o'tish: bitta IP'dan soatiga 5 ta akkaunt
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  onlySuccess: true,
  message: "Bu tarmoqdan juda ko'p do'kon ochildi. Bir soatdan keyin urinib ko'ring.",
});
// Barcha urinishlar (validatsiya xatolari ham): spam/probing'ga qarshi
const registerAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
});
// Kod so'rash/tekshirish: IP'dan 15 daqiqada 10 ta
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
// O'zbekiston raqami: +998 XX XXX XX XX

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    business: user.business,
    phone: user.phone,
    tariff: user.tariff,
    tariffStatus: user.tariffStatus,
    trialDaysLeft: user.trialDaysLeft,
    emailVerified: user.emailVerified !== false,
    totalOrders: user.totalOrders,
    totalRevenue: user.totalRevenue,
    totalCustomers: user.totalCustomers,
    totalProducts: user.totalProducts,
  };
}

function codeErrorResponse(res, err) {
  if (err instanceof CooldownError) {
    return res
      .status(429)
      .json({
        success: false,
        message: `Yangi kodni ${err.seconds} soniyadan keyin so'rashingiz mumkin`,
      });
  }
  if (err instanceof MailNotConfiguredError) {
    return res
      .status(503)
      .json({
        success: false,
        message:
          "Email xizmati vaqtincha ishlamayapti. Admin bilan bog'laning.",
      });
  }
  console.error("Auth code error:", err);
  return res.status(500).json({ success: false, message: "Server xatoligi" });
}

// POST /api/auth/register
router.post("/register", registerAttemptLimiter, registerLimiter, async (req, res) => {
  try {
    const { name, email, password, business, phone, website } = req.body || {};

    // Honeypot: odam ko'rmaydigan maydon — bot to'ldiradi
    if (website)
      return res
        .status(400)
        .json({ success: false, message: "So'rov rad etildi" });

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const cleanBusiness = String(business || "").trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res
        .status(400)
        .json({
          success: false,
          field: "name",
          message: "Ismingizni kiriting (2–100 belgi)",
        });
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return res
        .status(400)
        .json({
          success: false,
          field: "email",
          message: "Email noto'g'ri. Masalan: ism@gmail.com",
        });
    }
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      return res
        .status(400)
        .json({
          success: false,
          field: "phone",
          message: "Telefon raqam noto'g'ri. Masalan: +998 90 123 45 67",
        });
    }
    if (cleanBusiness.length < 2 || cleanBusiness.length > 120) {
      return res
        .status(400)
        .json({
          success: false,
          field: "business",
          message: "Do'kon nomini kiriting",
        });
    }
    const pwError = checkPassword(password, {
      email: cleanEmail,
      name: cleanName,
      phone: cleanPhone,
    });
    if (pwError)
      return res
        .status(400)
        .json({ success: false, field: "password", message: pwError });

    const existingUser = await User.findOne({ email: cleanEmail }).lean();
    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          field: "email",
          message:
            "Bu email bilan akkaunt bor. Kirish yoki parolni tiklashdan foydalaning.",
        });
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      business: cleanBusiness,
      phone: cleanPhone,
      role: "shop_owner",
      tariff: "trial",
      emailVerified: false,
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // Tasdiqlash kodi. Yuborilmasa ham akkaunt ochiladi — keyin "qayta yuborish" bilan olinadi.
    let codeSent = true;
    try {
      await issueCode(cleanEmail, "verify_email");
    } catch (err) {
      codeSent = false;
      console.error("Verify code send failed:", err.message);
    }

    res.status(201).json({
      success: true,
      data: {
        token: signToken({ id: user._id }),
        user: publicUser(user),
        codeSent,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email va parolni kiriting" });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+password");
    if (!user || !(await user.comparePassword(String(password)))) {
      return res
        .status(401)
        .json({ success: false, message: "Email yoki parol noto'g'ri" });
    }
    if (!user.isActive) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Hisobingiz bloklangan. Administrator bilan bog'laning.",
        });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      data: { token: signToken({ id: user._id }), user: publicUser(user) },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// POST /api/auth/verify-email/send — tasdiqlash kodini qayta yuborish
router.post(
  "/verify-email/send",
  codeLimiter,
  authenticate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (user.emailVerified !== false)
        return res.json({
          success: true,
          message: "Email allaqachon tasdiqlangan",
        });
      await issueCode(user.email, "verify_email");
      res.json({
        success: true,
        message: `Kod ${user.email} manziliga yuborildi`,
      });
    } catch (err) {
      codeErrorResponse(res, err);
    }
  },
);

// POST /api/auth/verify-email — { code }
router.post("/verify-email", codeLimiter, authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.emailVerified !== false)
      return res.json({ success: true, data: publicUser(user) });
    const ok = await consumeCode(user.email, "verify_email", req.body?.code);
    if (!ok)
      return res
        .status(400)
        .json({
          success: false,
          message: "Kod noto'g'ri yoki muddati o'tgan. Yangi kod so'rang.",
        });
    user.emailVerified = true;
    await user.save();
    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    codeErrorResponse(res, err);
  }
});

// POST /api/auth/forgot — { email }. Javob email mavjud-mavjud emasligidan qat'i nazar BIR XIL.
const FORGOT_OK = {
  success: true,
  message:
    "Agar bu email ro'yxatdan o'tgan bo'lsa, unga 6 xonali kod yuborildi.",
};
router.post("/forgot", codeLimiter, async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ success: false, message: "Email noto'g'ri" });
  try {
    const user = await User.findOne({ email, isActive: true })
      .select("_id")
      .lean();
    if (user) await issueCode(email, "reset_password");
  } catch (err) {
    // Cooldown va boshqa xatolarni tashqariga chiqarmaymiz — aks holda email borligi bilinib qoladi
    if (err instanceof MailNotConfiguredError)
      return codeErrorResponse(res, err);
    if (!(err instanceof CooldownError)) console.error("Forgot error:", err);
  }
  res.json(FORGOT_OK);
});

// POST /api/auth/reset — { email, code, newPassword }
router.post("/reset", codeLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const { code, newPassword } = req.body || {};
    const user = await User.findOne({ email, isActive: true }).select(
      "+password",
    );
    const ok = user ? await consumeCode(email, "reset_password", code) : false;
    if (!ok)
      return res
        .status(400)
        .json({
          success: false,
          message: "Kod noto'g'ri yoki muddati o'tgan. Yangi kod so'rang.",
        });

    const pwError = checkPassword(newPassword, {
      email,
      name: user.name,
      phone: user.phone,
    });
    if (pwError) {
      // Kod ishlatildi — parol yaroqsiz bo'lsa, foydalanuvchi qayta kod so'raydi
      return res
        .status(400)
        .json({
          success: false,
          field: "password",
          codeConsumed: true,
          message: pwError,
        });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.emailVerified = true; // kodni email orqali oldi — demak email uniki
    await user.save();

    res.json({
      success: true,
      data: { token: signToken({ id: user._id }), user: publicUser(user) },
    });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    res.json({
      success: true,
      data: {
        ...publicUser(user),
        trialEndsAt: user.trialEndsAt,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        autoPayment: user.autoPayment,
        paymentMethod: user.paymentMethod,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// PUT /api/auth/profile
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, business, phone } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });

    if (name) user.name = String(name).trim().slice(0, 100);
    if (business !== undefined)
      user.business = String(business).trim().slice(0, 120);
    if (phone !== undefined && phone !== "") {
      const p = normalizePhone(phone);
      if (!p)
        return res
          .status(400)
          .json({ success: false, message: "Telefon raqam noto'g'ri" });
      user.phone = p;
    }
    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        business: user.business,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

// PUT /api/auth/password
router.put("/password", loginLimiter, authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.id).select("+password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Joriy va yangi parolni kiriting" });
    }
    if (!(await user.comparePassword(String(currentPassword)))) {
      return res
        .status(400)
        .json({ success: false, message: "Joriy parol noto'g'ri" });
    }
    const pwError = checkPassword(newPassword, {
      email: user.email,
      name: user.name,
      phone: user.phone,
    });
    if (pwError)
      return res
        .status(400)
        .json({ success: false, field: "password", message: pwError });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Boshqa qurilmalardagi sessiyalar o'chadi; shu qurilma uchun yangi token
    res.json({
      success: true,
      message: "Parol o'zgartirildi",
      data: { token: signToken({ id: user._id }) },
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ success: false, message: "Server xatoligi" });
  }
});

module.exports = router;
