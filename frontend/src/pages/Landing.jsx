import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Send,
  PackageMinus,
  BarChart3,
  ScanLine,
  ChevronDown,
} from "lucide-react";
import api from "../services/api";
import ReceiptPrinter from "../components/ReceiptPrinter";
import BrandMark from "../components/BrandMark";
import LanguageSwitcher from "../components/LanguageSwitcher";
import {
  PullTag,
  ParallaxProps,
  useScenePalette,
  updateParallax,
} from "../components/LandingMotion";

const fmt = (n) =>
  Number(n || 0)
    .toLocaleString("ru-RU")
    .replace(/,/g, " ");
const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------- Scroll animatsiya yordamchilari ----------

// Element ekranga kirganda bir marta true bo'ladi
function useInView(
  options = { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reducedMotion() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView];
}

function Reveal({ as: Tag = "div", from = "up", delay = 0, className = "", children, ...rest }) {
  const [ref, inView] = useInView();
  const [shown, setShown] = useState(false);
  // Kechikish timer orqali — transition-delay hover effektlarini sekinlashtirmasin
  useEffect(() => {
    if (!inView) return undefined;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);
  return (
    <Tag ref={ref} data-from={from} className={`reveal ${shown ? "in" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

function CountUp({ to, prefix = "", duration = 1400 }) {
  const [ref, inView] = useInView({ threshold: 0.6 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return undefined;
    if (reducedMotion()) {
      setVal(to);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {fmt(val)}
    </span>
  );
}

// ---------- Kontent ----------

const DAY = [
  {
    time: "08:00",
    slug: "kassa",
    icon: ScanLine,
    title: "Kassa ochiladi",
    text: "Shtrix-kodni skanerlang yoki nomini yozing. Chek chiqadi, qoldiq o'zi kamayadi.",
    demo: (
      <div className="font-mono text-[0.8125rem] text-[#1E293B] space-y-1">
        <div className="demo-step flex justify-between">
          <span>iPhone 15 128GB</span>
          <span>11 900 000</span>
        </div>
        <div className="demo-step flex justify-between">
          <span>G'ilof + oyna</span>
          <span>85 000</span>
        </div>
        <div className="demo-step flex justify-between font-semibold border-t border-dashed border-[#94A3B8] pt-1">
          <span>Jami</span>
          <span>11 985 000</span>
        </div>
      </div>
    ),
  },
  {
    time: "11:30",
    slug: "telegram",
    icon: Send,
    title: "Telegramdan buyurtma keladi",
    text: "Mijoz botingizda mahsulot tanlaydi. Buyurtma ro'yxatingizga tushadi, komissiya yo'q.",
    demo: (
      <div className="space-y-2 text-[0.8125rem]">
        <div className="demo-step demo-pop ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#2AABEE] text-white px-3 py-2">
          Assalomu alaykum, Casio soatning qora rangi bormi? Chilonzorga yetkazasizmi?
        </div>
        <div className="demo-step demo-pop w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-[#E2E8F0] px-3 py-2 text-[#1E293B]">
          Bor. Buyurtma #218 qabul qilindi: 690 000 so'm, bugun 18:00 gacha.
        </div>
      </div>
    ),
  },
  {
    time: "15:10",
    slug: "ombor",
    icon: PackageMinus,
    title: "Tugayotgan mahsulot haqida eslatma",
    text: "Qoldiq kamaysa, ilova ogohlantiradi. Peshtaxta bo'shab qolmaydi.",
    demo: (
      <div className="demo-step demo-nudge flex items-center gap-3 rounded-xl bg-[#FFF6DB] border border-[#F5D27A] px-3 py-2.5 text-[0.8125rem] text-[#5B4300]">
        <span className="font-display text-lg text-[#B07D00]">3</span>
        <span>AirPods Pro 2 — 3 ta qoldi. Haftasiga o'rtacha 7 ta sotiladi.</span>
      </div>
    ),
  },
  {
    time: "21:00",
    slug: "hisobotlar",
    icon: BarChart3,
    title: "Kun yopiladi",
    text: "Tushum, foyda, nasiya va eng ko'p sotilganlar — kechqurun daftar bilan o'tirish shart emas.",
    demo: (
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Tushum", 18640000, ""],
          ["Cheklar", 23, ""],
          ["Nasiya", 2400000, "+"],
        ].map(([k, v, pre]) => (
          <div
            key={k}
            className="demo-step rounded-lg bg-white border border-[#E2E8F0] py-2 px-1"
          >
            <p className="font-display text-[0.875rem] text-[#0F172A]">
              <CountUp to={v} prefix={pre} />
            </p>
            <p className="text-[0.6875rem] text-[#64748B]">{k}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const LEDGER = [
  { name: "Dilnoza opa", sum: "1 200 000", due: "15.11", late: false },
  { name: "Rustam aka (Malika)", sum: "2 400 000", due: "02.11", late: true },
  { name: "Sardor", sum: "650 000", due: "20.11", late: false },
  { name: "Shoxrux usta", sum: "890 000", due: "10.11", late: false },
];

const PLAN_CTA = {
  start: "Start'ni sinash",
  pro: "Pro'ni sinash",
  business: "Biznes'ni sinash",
};

const btnPrimary =
  "btn-press inline-flex items-center justify-center whitespace-nowrap rounded-full scene-btn text-white font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]";

// ---------- Sahifa ----------

export default function Landing() {
  const [plans, setPlans] = useState(null);
  const [yearly, setYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const timelineRef = useRef(null);
  const sceneRef = useRef(null);
  useScenePalette(sceneRef);
  const [ledgerRef, ledgerIn] = useInView({ threshold: 0.35 });

  useEffect(() => {
    let alive = true;
    api
      .request("/subscription/plans")
      .then((r) => alive && setPlans(r?.data || null))
      .catch(() => alive && setPlans(null));
    return () => {
      alive = false;
    };
  }, []);

  // Sticky nav fon + timeline chizig'ining scroll bo'yicha to'lishi
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 24);
      const ol = timelineRef.current;
      if (ol) {
        const r = ol.getBoundingClientRect();
        const p = (window.innerHeight * 0.6 - r.top) / r.height;
        ol.style.setProperty("--p", String(Math.max(0, Math.min(1, p))));
      }
      updateParallax(sceneRef.current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const headline = "Do'kon hisobini daftar emas, ilova yuritsin.".split(" ");

  return (
    <div
      ref={sceneRef}
      data-scene="hero"
      data-motion={reducedMotion() ? "off" : "on"}
      className="landing-scene font-body min-h-screen"
    >
      {/* Navigatsiya: hero ustida shaffof, scrollda qattiq fon */}
      <header
        className={`landing-nav fixed inset-x-0 top-0 z-40 text-[#0F172A] transition-[background-color,box-shadow] duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur shadow-[0_8px_24px_-16px_rgba(15,23,42,.35)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
          <Link to="/" aria-label="OsonBiznes bosh sahifa" className="shrink-0">
            <BrandMark compact />
          </Link>
          <nav
            className="hidden md:flex items-center gap-1 text-sm"
            aria-label="Bo'limlar"
          >
            <Link to="/qanday-ishlaydi" className="nav-link">
              Qanday ishlaydi
            </Link>
            <Link to="/nasiya" className="nav-link">
              Nasiya
            </Link>
            <Link to="/narxlar" className="nav-link">
              Narxlar
            </Link>
            <Link to="/marketplace" className="nav-link">
              OsonBozor
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 text-sm">
            <div className="hidden lg:block mr-1">
              <LanguageSwitcher />
            </div>
            <Link to="/login" className="nav-link whitespace-nowrap">
              Kirish
            </Link>
            <Link
              to="/login?register=1"
              className={`${btnPrimary} px-4 py-2 text-sm`}
            >
              Bepul boshlash
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        data-scene="hero"
        className="auth-light text-[#0F172A] overflow-hidden relative"
      >
        <span className="auth-blob auth-blob-a" aria-hidden="true" />
        <span className="auth-blob auth-blob-b" aria-hidden="true" />
        <span className="auth-blob auth-blob-c" aria-hidden="true" />
        {/* Osilgan teg — o'ng ustun boshida, faqat katta ekranda */}
        <div className="hidden lg:grid absolute inset-x-0 top-0 max-w-6xl mx-auto px-4 sm:px-6 grid-cols-[1.15fr_1fr] gap-14 pointer-events-none">
          <div />
          <div className="relative pointer-events-auto">
            <PullTag />
          </div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 lg:pt-36 lg:pb-28 grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
          <div>
            <h1 className="font-display font-extrabold text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem] tracking-[-0.02em]">
              {headline.map((w, i) => (
                <React.Fragment key={i}>
                  <span className="word-mask">
                    <span
                      className="word"
                      style={{ animationDelay: `${120 + i * 70}ms` }}
                    >
                      {w}
                    </span>
                  </span>{" "}
                </React.Fragment>
              ))}
            </h1>
            <p
              className="hero-fade mt-6 text-lg text-[#475569] max-w-[34rem] leading-relaxed"
              style={{ animationDelay: "650ms" }}
            >
              Kassa, ombor, nasiya va Telegram buyurtmalar bir joyda. Har bir
              sotuv o'zi yoziladi, har bir qarz o'z vaqtida eslatiladi.
            </p>
            <div
              className="hero-fade mt-9 flex flex-wrap items-center gap-x-5 gap-y-3"
              style={{ animationDelay: "800ms" }}
            >
              <Link
                to="/login?register=1"
                className={`${btnPrimary} px-7 py-4 text-base`}
              >
                14 kun bepul sinash
              </Link>
              <a
                href="#kun"
                className="group inline-flex items-center gap-1.5 font-semibold text-[#334155] hover:text-[#047857]"
              >
                Qanday ishlaydi
                <ChevronDown
                  className="w-4 h-4 transition-transform group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
            <p
              className="hero-fade mt-4 text-sm text-[#64748B]"
              style={{ animationDelay: "900ms" }}
            >
              Karta talab qilinmaydi. Ro'yxatdan o'tish 1 daqiqa.
            </p>
          </div>
          <div
            className="flex justify-center lg:justify-end hero-fade"
            style={{ animationDelay: "300ms" }}
          >
            <ReceiptPrinter />
          </div>
        </div>
      </section>

      {/* Do'kon kuni */}
      <section
        id="kun"
        data-scene="kun"
        className="px-host scroll-mt-16 max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28"
      >
        <ParallaxProps
          items={[
            ["coin", 88, 6, 64, 0.45, -12],
            ["receipt", 92, 38, 58, 0.3, 10],
            ["coin", 70, 22, 30, 0.2, 0],
            ["barcode", 84, 70, 72, 0.55, -8],
            ["box", 62, 88, 36, 0.22, 14],
            ["plane", 95, 55, 34, 0.25, 0],
          ]}
        />
        <Reveal>
          <h2 className="font-display font-bold text-3xl sm:text-4xl max-w-2xl leading-tight">
            Bir kun OsonBiznes bilan
          </h2>
          <p className="mt-3 text-[#64748B] max-w-xl">
            Ertalab kassadan kechki hisobotgacha — siz sotasiz, qolganini ilova
            yozib boradi.
          </p>
        </Reveal>

        <ol
          ref={timelineRef}
          className="timeline mt-14 relative ml-3 sm:ml-[5.5rem] space-y-14"
        >
          {DAY.map(({ time, slug, icon: Icon, title, text, demo }) => (
            <Reveal
              as="li"
              key={time}
              from="left"
              className="timeline-item relative pl-8 sm:pl-10 grid md:grid-cols-[1fr_minmax(0,22.5rem)] gap-6 items-start"
            >
              <span className="timeline-dot" aria-hidden="true" />
              <span className="hidden sm:block absolute -left-[6.2rem] top-0 font-display text-[#0F172A] text-lg w-20 text-right">
                {time}
              </span>
              <div>
                <p className="sm:hidden font-display text-[#0F172A] mb-1">
                  {time}
                </p>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icon className="w-5 h-5 scene-accent" aria-hidden="true" />{" "}
                  {title}
                </h3>
                <p className="mt-2 text-[#475569] leading-relaxed max-w-md">
                  {text}
                </p>
                <Link to={`/imkoniyatlar/${slug}`} className="mt-3 inline-block text-sm font-semibold scene-accent hover:underline">
                  Batafsil
                </Link>
              </div>
              <div className="demo-card rounded-2xl bg-[#F1F5F9] p-4">
                {demo}
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Nasiya daftari */}
      <section
        id="nasiya"
        data-scene="nasiya"
        className="px-host scroll-mt-16 border-y border-black/5"
      >
        <ParallaxProps
          items={[
            ["coin", 4, 12, 56, 0.5, 18],
            ["coin", 8, 70, 32, 0.2, 0],
            ["bag", 94, 14, 60, 0.4, 8],
            ["receipt", 48, 86, 34, 0.22, -6],
            ["coin", 90, 78, 40, 0.3, -20],
          ]}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div
            ref={ledgerRef}
            className={`ledger ledger-tilt rounded-md shadow-[0_20px_40px_-24px_rgba(15,61,46,.45)] pt-[2.125rem] pb-6 pr-6 ${ledgerIn ? "is-written" : ""}`}
          >
            {LEDGER.map((r, i) => (
              <div
                key={r.name}
                className="ledger-row h-9 pl-[3.75rem] flex items-end justify-between text-[1.375rem] leading-none pb-1.5 text-[#23395B]"
                style={{ "--d": `${i * 420}ms` }}
              >
                <span className={`ink relative ${r.late ? "is-late" : ""}`}>
                  {r.name}
                </span>
                <span className="ink flex items-baseline gap-3">
                  {r.sum}
                  <span
                    className={`text-[1.0625rem] ${r.late ? "text-[#B4231B] font-bold" : "text-[#64748B]"}`}
                  >
                    {r.due}
                  </span>
                </span>
              </div>
            ))}
            <div className="h-9" />
          </div>
          <Reveal from="right">
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
              Nasiya daftari endi yo'qolmaydi
            </h2>
            <p className="mt-4 text-[#475569] leading-relaxed max-w-lg">
              Kim qancha qarz, qachon qaytarishi kerak — hammasi bitta
              ro'yxatda. Muddati o'tgan qarzni ilova o'zi belgilaydi,
              to'langanini bir bosishda yopasiz.
            </p>
            <ul className="mt-6 space-y-3 text-[0.9375rem]">
              {[
                'Kassada "Nasiya" tugmasi — qarz mijoz kartasiga o\'zi yoziladi',
                "Qisman to'lov va qolgan summa avtomatik hisoblanadi",
                "Muddati o'tganlar alohida ro'yxatda",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check
                    className="w-5 h-5 scene-accent shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  {t}
                </li>
              ))}
            </ul>
            <Link to="/nasiya" className="mt-6 inline-block font-semibold scene-accent hover:underline">
              Nasiya daftari haqida batafsil
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Narxlar */}
      <section
        id="narxlar"
        data-scene="narxlar"
        className="px-host scroll-mt-16 max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28"
      >
        <ParallaxProps
          items={[
            ["box", 2, 4, 58, 0.45, -10],
            ["plane", 96, 8, 52, 0.5, 6],
            ["coin", 30, 2, 28, 0.18, 0],
            ["bag", 97, 70, 36, 0.24, -8],
          ]}
        />
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">
              Narxlar
            </h2>
            <p className="mt-3 text-[#64748B]">
              Har qanday tarifni 14 kun bepul sinab ko'ring.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="To'lov davri"
            className="self-start sm:self-auto inline-flex p-1 rounded-full bg-[#E2E8F0] text-sm font-semibold"
          >
            {[
              [false, "Oylik"],
              [true, "Yillik −20%"],
            ].map(([val, label]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={yearly === val}
                onClick={() => setYearly(val)}
                className={`px-4 py-2 rounded-full transition-colors ${yearly === val ? "bg-[#047857] text-white" : "text-[#475569] hover:text-[#0F172A]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-5 items-stretch">
          {(plans?.plans || []).map((p, i) => {
            const featured = p.key === "pro";
            const price = yearly ? Math.round(p.yearly / 12) : p.monthly;
            return (
              <Reveal
                key={p.key}
                delay={i * 110}
                className={`plan-card flex flex-col ${
                  featured
                    ? "bg-[#ECFDF5] text-[#0F172A] rounded-3xl p-7 md:-my-4 border-2 border-[#10B981] shadow-[0_30px_60px_-30px_rgba(16,185,129,.55)]"
                    : "bg-white rounded-2xl p-7 border border-[#E2E8F0] hover:border-[#0F172A]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display font-bold text-xl">{p.name}</h3>
                  {featured && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#047857] text-white whitespace-nowrap">
                      Ko'pchilik tanlaydi
                    </span>
                  )}
                </div>
                <p className="mt-5 flex items-baseline flex-wrap gap-x-1.5">
                  <span
                    key={price}
                    className="price-swap font-display font-extrabold text-4xl"
                  >
                    {fmt(price)}
                  </span>
                  <span
                    className={"text-[#64748B]"}
                  >
                    so'm/oy
                  </span>
                </p>
                <p
                  className={`text-sm mt-1 h-5 text-[#64748B]`}
                >
                  {yearly ? `Yiliga ${fmt(p.yearly)} so'm bir martada` : ""}
                </p>
                <ul className="mt-6 space-y-2.5 text-[0.9375rem] mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-1 ${featured ? "text-[#10B981]" : "text-[#10B981]"}`}
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login?register=1"
                  className={`btn-press mt-auto block text-center py-3.5 rounded-full font-bold ${
                    featured
                      ? "bg-[#047857] text-white hover:bg-[#065F46]"
                      : "bg-white text-[#047857] border-2 border-[#10B981]/60 hover:bg-[#ECFDF5]"
                  }`}
                >
                  {PLAN_CTA[p.key] || "Bepul sinash"}
                </Link>
              </Reveal>
            );
          })}
          {!plans && <p className="text-[#64748B]">Narxlar yuklanmoqda…</p>}
        </div>
        <p className="mt-8 text-sm text-[#64748B]">
          Sinov tugagach tarifni o'zingiz tanlaysiz. Avtomatik yechib olinmaydi.
        </p>
      </section>

      {/* Footer */}
      <footer data-scene="narxlar" className="border-t border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
          <Reveal className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <p className="font-display font-bold text-3xl sm:text-4xl max-w-xl leading-tight">
              Bugun kechqurun hisobni ilova qilsin.
            </p>
            <Link
              to="/login?register=1"
              className={`${btnPrimary} self-start md:self-auto px-7 py-4 text-base`}
            >
              14 kun bepul sinash
            </Link>
          </Reveal>
          <div className="mt-14 pt-6 border-t border-[#A7F3D0] flex flex-col sm:flex-row justify-between gap-4 text-sm text-[#475569]">
            <p>© {new Date().getFullYear()} OsonBiznes, Toshkent</p>
            <div className="flex gap-5">
              <Link to="/narxlar" className="hover:text-[#047857]">
                Narxlar
              </Link>
<Link to="/qanday-ishlaydi" className="hover:text-[#047857]">
                Qanday ishlaydi
              </Link>
              <Link to="/imkoniyatlar/osonbozor" className="hover:text-[#047857]">
                OsonBozor
              </Link>
              <Link to="/login" className="hover:text-[#047857]">
                Kirish
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
