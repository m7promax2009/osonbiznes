import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  MessageSquare,
  ArrowLeft,
  Check,
  X,
  MailCheck,
} from "lucide-react";
import api from "../services/api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import SupportModal from "../components/SupportModal";
import BrandMark from "../components/BrandMark";
import InteractiveReceipt from "../components/InteractiveReceipt";

// Server qoidalari bilan mos (backend/src/services/passwordPolicy.js) — server baribir yakuniy tekshiradi
function passwordChecks(pw, { email = "", name = "" } = {}) {
  const low = pw.toLowerCase();
  const local = email.split("@")[0].toLowerCase();
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() || "";
  return [
    { ok: pw.length >= 8, label: "Kamida 8 belgi" },
    {
      ok: /[a-zA-Zа-яА-Я]/.test(pw) && /\d/.test(pw),
      label: "Harf va raqam aralash",
    },
    {
      ok:
        pw.length > 0 &&
        !(local.length >= 4 && low.includes(local)) &&
        !(first.length >= 4 && low.includes(first)),
      label: "Ism yoki emailingiz emas",
    },
  ];
}

function strength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: "", color: "bg-slate-200" },
  { label: "Juda zaif", color: "bg-red-500" },
  { label: "Zaif", color: "bg-orange-500" },
  { label: "Yaxshi", color: "bg-[#10B981]" },
  { label: "Kuchli", color: "bg-[#10B981]" },
];

const input =
  "w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[0.95rem] text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#0F172A] focus:ring-4 focus:ring-[#0F172A]/10";
const primaryBtn =
  "w-full py-3.5 rounded-full bg-[#047857] text-white font-bold text-base hover:bg-[#065F46] shadow-[0_8px_20px_-8px_rgba(4,120,87,.6)] disabled:opacity-60 flex justify-center items-center gap-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#334155] mb-1.5">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-xs text-[#64748B] mt-1.5">{hint}</span>
      )}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${input} pr-11`}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A]"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function StrengthMeter({ password, email, name }) {
  const lvl = strength(password);
  const checks = passwordChecks(password, { email, name });
  if (!password) return null;
  return (
    <div className="mt-2.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= lvl ? STRENGTH[lvl].color : "bg-slate-200"}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
        <span className="font-semibold text-[#334155]">
          {STRENGTH[lvl].label}
        </span>
        {checks.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 ${c.ok ? "text-[#047857]" : "text-[#94A3B8]"}`}
          >
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}{" "}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeInput({ value, onChange }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={`${input} text-center text-2xl tracking-[0.5em] font-display`}
      placeholder="••••••"
    />
  );
}

export default function Login({ onLogin }) {
  const initialMode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("register") === "1"
        ? "register"
        : "login";
    } catch {
      return "login";
    }
  }, []);
  const [mode, setMode] = useState(initialMode); // login | register | verify | forgot | reset
  const [step, setStep] = useState(1); // register: 1 — do'kon, 2 — akkaunt
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    business: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    website: "",
  });
  const [pendingUser, setPendingUser] = useState(null);
  const [code, setCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const go = (m) => {
    setMode(m);
    setError("");
    setInfo("");
    setCode("");
    if (m === "register") setStep(1);
  };

  const run = async (fn) => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = (e) => {
    e.preventDefault();
    if (!login.email || !login.password)
      return setError("Email va parolni kiriting");
    run(async () => {
      const data = await api.login(login.email.trim(), login.password);
      onLogin(data.user);
    });
  };

  const submitRegStep1 = (e) => {
    e.preventDefault();
    if (reg.business.trim().length < 2)
      return setError("Do'kon nomini kiriting");
    if (reg.name.trim().length < 2) return setError("Ismingizni kiriting");
    const digits = reg.phone.replace(/\D/g, "");
    if (digits.length !== 9) {
      return setError("Telefon raqamni to'liq kiriting: 90 123 45 67");
    }
    setError("");
    setStep(2);
  };

  const submitRegStep2 = (e) => {
    e.preventDefault();
    run(async () => {
      const data = await api.register({ ...reg, email: reg.email.trim() });
      setPendingUser(data.user);
      setMode("verify");
      setInfo(
        data.codeSent
          ? `${data.user.email} manziliga 6 xonali kod yuborildi.`
          : 'Kodni yuborib bo\'lmadi. Birozdan keyin "Qayta yuborish"ni bosing.',
      );
    });
  };

  const submitVerify = (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError("6 xonali kodni kiriting");
    run(async () => {
      const user = await api.verifyEmail(code);
      onLogin(user);
    });
  };

  const resend = () =>
    run(async () => {
      const r = await api.resendVerifyEmail();
      setInfo(r.message || "Kod qayta yuborildi");
    });

  const submitForgot = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.forgotPassword(resetEmail.trim());
      setMode("reset");
      setInfo(r.message);
    });
  };

  const submitReset = (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError("6 xonali kodni kiriting");
    run(async () => {
      const data = await api.resetPassword(
        resetEmail.trim(),
        code,
        newPassword,
      );
      onLogin(data.user);
    });
  };

  const titles = {
    login: ["Xush kelibsiz", "Do'koningiz hisobiga kiring"],
    register: [
      step === 1 ? "Do'koningizni oching" : "Akkaunt yarating",
      step === 1
        ? "14 kun bepul. Karta talab qilinmaydi."
        : "Kod shu emailga keladi — parolni unutsangiz ham shu orqali tiklaysiz.",
    ],
    verify: ["Emailingizni tasdiqlang", ""],
    forgot: [
      "Parolni tiklash",
      "Ro'yxatdan o'tgan emailingizni kiriting — unga kod yuboramiz.",
    ],
    reset: ["Yangi parol", ""],
  };
  const [title, subtitle] = titles[mode];

  return (
    <>
      <div className="min-h-screen flex font-body bg-[#F8FAFC]">
        {/* Chap: forma */}
        <div className="flex-1 flex flex-col px-5 sm:px-10 lg:px-14 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label="Bosh sahifa">
              <BrandMark />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[#475569] hover:text-[#0F172A] hover:bg-white transition"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Yordam
              </button>
              <LanguageSwitcher />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-10">
            <div key={mode + step} className="w-full max-w-[26rem] auth-panel">
              {(mode !== "login" || step > 1) && mode !== "verify" && (
                <button
                  type="button"
                  onClick={() =>
                    mode === "register" && step === 2 ? setStep(1) : go("login")
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#0F172A] mb-6"
                >
                  <ArrowLeft className="w-4 h-4" /> Orqaga
                </button>
              )}

              {mode === "register" && (
                <div
                  className="flex gap-2 mb-5"
                  aria-label={`${step}-qadam, 2 dan`}
                >
                  {[1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[#10B981]" : "bg-[#CBD5E1]"}`}
                    />
                  ))}
                </div>
              )}

              {mode === "verify" && (
                <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#047857] flex items-center justify-center mb-6">
                  <MailCheck className="w-7 h-7" />
                </div>
              )}

              <h1 className="font-display text-3xl sm:text-[2.1rem] font-bold text-[#0F172A] leading-tight">
                {title}
              </h1>
              {subtitle && <p className="text-[#64748B] mt-2">{subtitle}</p>}

              {error && (
                <div
                  role="alert"
                  className="mt-6 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
                >
                  {error}
                </div>
              )}
              {info && !error && (
                <div className="mt-6 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-sm text-[#1E293B]">
                  {info}
                </div>
              )}

              {mode === "login" && (
                <form onSubmit={submitLogin} className="mt-8 space-y-4">
                  <Field label="Email">
                    <input
                      type="email"
                      value={login.email}
                      onChange={(e) =>
                        setLogin({ ...login, email: e.target.value })
                      }
                      className={input}
                      placeholder="siz@gmail.com"
                      autoComplete="email"
                    />
                  </Field>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-[#334155]">
                        Parol
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(login.email);
                          go("forgot");
                        }}
                        className="text-xs font-semibold text-[#0F172A] hover:underline"
                      >
                        Parolni unutdingizmi?
                      </button>
                    </div>
                    <PasswordInput
                      value={login.password}
                      onChange={(v) => setLogin({ ...login, password: v })}
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn}
                  >
                    {loading ? "Kirilmoqda…" : "Kirish"}
                  </button>

                  {import.meta.env.DEV && (
                    <div className="pt-4 grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setLogin({
                            email: "demo@osonbiznes.uz",
                            password: "demo123",
                          })
                        }
                        className="py-2 rounded-lg border border-dashed border-[#CBD5E1] text-[#475569] hover:bg-white"
                      >
                        Demo do'kon
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLogin({
                            email: "admin@osonbiznes.uz",
                            password: "Admin123!",
                          })
                        }
                        className="py-2 rounded-lg border border-dashed border-[#CBD5E1] text-[#475569] hover:bg-white"
                      >
                        Admin
                      </button>
                    </div>
                  )}

                  <p className="text-center text-sm text-[#64748B] pt-2">
                    Do'koningiz hali yo'qmi?{" "}
                    <button
                      type="button"
                      onClick={() => go("register")}
                      className="font-bold text-[#0F172A] hover:underline"
                    >
                      Bepul oching
                    </button>
                  </p>
                </form>
              )}

              {mode === "register" && step === 1 && (
                <form onSubmit={submitRegStep1} className="mt-8 space-y-4">
                  <Field label="Do'kon nomi">
                    <input
                      value={reg.business}
                      onChange={(e) =>
                        setReg({ ...reg, business: e.target.value })
                      }
                      className={input}
                      placeholder="Masalan: Mahalla do'koni"
                      autoComplete="organization"
                    />
                  </Field>
                  <Field label="Ismingiz">
                    <input
                      value={reg.name}
                      onChange={(e) => setReg({ ...reg, name: e.target.value })}
                      className={input}
                      placeholder="Aziz Karimov"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Telefon">
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] text-[0.95rem]">
                        +998
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={reg.phone}
                        onChange={(e) => {
                          // Faqat raqam, ko'pi bilan 9 ta (998 bilan yopishtirilsa — olib tashlanadi)
                          let d = e.target.value.replace(/\D/g, "");
                          if (d.length > 9 && d.startsWith("998")) d = d.slice(3);
                          setReg({ ...reg, phone: d.slice(0, 9) });
                        }}
                        maxLength={12}
                        className={`${input} rounded-l-none`}
                        placeholder="90 123 45 67"
                        autoComplete="tel-national"
                      />
                    </div>
                  </Field>
                  <button type="submit" className={primaryBtn}>
                    Davom etish
                  </button>
                  <p className="text-center text-sm text-[#64748B] pt-2">
                    Akkauntingiz bormi?{" "}
                    <button
                      type="button"
                      onClick={() => go("login")}
                      className="font-bold text-[#0F172A] hover:underline"
                    >
                      Kirish
                    </button>
                  </p>
                </form>
              )}

              {mode === "register" && step === 2 && (
                <form onSubmit={submitRegStep2} className="mt-8 space-y-4">
                  <Field label="Email">
                    <input
                      type="email"
                      value={reg.email}
                      onChange={(e) =>
                        setReg({ ...reg, email: e.target.value })
                      }
                      className={input}
                      placeholder="siz@gmail.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Parol">
                    <PasswordInput
                      value={reg.password}
                      onChange={(v) => { setReg({ ...reg, password: v }); setError('') }}
                      autoComplete="new-password"
                      placeholder="Kamida 8 belgi, harf va raqam"
                    />
                    <StrengthMeter
                      password={reg.password}
                      email={reg.email}
                      name={reg.name}
                    />
                  </Field>
                  {/* Honeypot — odamlar ko'rmaydi, botlar to'ldiradi */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={reg.website}
                    onChange={(e) =>
                      setReg({ ...reg, website: e.target.value })
                    }
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                    aria-hidden="true"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn}
                  >
                    {loading ? "Ochilmoqda…" : "Do'konni ochish"}
                  </button>
                  <p className="text-xs text-[#64748B] text-center">
                    Emailga tasdiqlash kodi keladi. Tasdiqlanmagan do'kon
                    OsonBozor'da ko'rinmaydi.
                  </p>
                </form>
              )}

              {mode === "verify" && (
                <form onSubmit={submitVerify} className="mt-8 space-y-4">
                  <CodeInput value={code} onChange={setCode} />
                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn}
                  >
                    {loading ? "Tekshirilmoqda…" : "Tasdiqlash"}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={resend}
                      disabled={loading}
                      className="font-semibold text-[#0F172A] hover:underline"
                    >
                      Kodni qayta yuborish
                    </button>
                    <button
                      type="button"
                      onClick={() => pendingUser && onLogin(pendingUser)}
                      className="text-[#64748B] hover:text-[#0F172A]"
                    >
                      Keyinroq
                    </button>
                  </div>
                </form>
              )}

              {mode === "forgot" && (
                <form onSubmit={submitForgot} className="mt-8 space-y-4">
                  <Field label="Email">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={input}
                      placeholder="siz@gmail.com"
                      autoComplete="email"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn}
                  >
                    {loading ? "Yuborilmoqda…" : "Kod yuborish"}
                  </button>
                  <p className="text-xs text-[#64748B]">
                    Emailingizga ham kira olmasangiz,{" "}
                    <button
                      type="button"
                      onClick={() => setShowSupport(true)}
                      className="underline"
                    >
                      admin bilan bog'laning
                    </button>
                    .
                  </p>
                </form>
              )}

              {mode === "reset" && (
                <form onSubmit={submitReset} className="mt-8 space-y-4">
                  <Field
                    label="Emaildagi 6 xonali kod"
                    hint="Kod 15 daqiqa amal qiladi. 5 marta noto'g'ri kiritilsa bekor bo'ladi."
                  >
                    <CodeInput value={code} onChange={setCode} />
                  </Field>
                  <Field label="Yangi parol">
                    <PasswordInput
                      value={newPassword}
                      onChange={setNewPassword}
                      autoComplete="new-password"
                      placeholder="Kamida 8 belgi, harf va raqam"
                    />
                    <StrengthMeter password={newPassword} email={resetEmail} />
                  </Field>
                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn}
                  >
                    {loading ? "Saqlanmoqda…" : "Parolni yangilash va kirish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => go("forgot")}
                    className="text-sm font-semibold text-[#0F172A] hover:underline"
                  >
                    Kod kelmadimi? Qayta so'rash
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* O'ng: interaktiv kassa */}
        <div className="hidden lg:flex w-[46%] max-w-[44rem] auth-light relative overflow-hidden items-center justify-center p-12">
          <span className="auth-blob auth-blob-a" aria-hidden="true" />
          <span className="auth-blob auth-blob-b" aria-hidden="true" />
          <span className="auth-blob auth-blob-c" aria-hidden="true" />
          <div className="relative flex flex-col items-center">
            <InteractiveReceipt />
          </div>
        </div>
      </div>

      <SupportModal
        isOpen={showSupport}
        onClose={() => setShowSupport(false)}
      />
    </>
  );
}
