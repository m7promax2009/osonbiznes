import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------- Bo'limga qarab sahifa rangini almashtirish ----------
// Har bir [data-scene] bo'lim ekran o'rtasini kesib o'tganda wrapper'ning
// data-scene atributi o'zgaradi, CSS o'zgaruvchilari (--bg, --ink, --accent)
// 600ms davomida silliq o'tadi. Atribut faqat Landing wrapper'ida — boshqa
// sahifalarga oqib o'tmaydi.
export function useScenePalette(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) root.dataset.scene = e.target.dataset.scene;
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    root.querySelectorAll("[data-scene]").forEach((el) => {
      if (el !== root) io.observe(el);
    });
    return () => io.disconnect();
  }, [rootRef]);
}

// ---------- Parallaks: har bir buyum o'z tezligida suzadi ----------
// Landing'dagi mavjud rAF scroll handler'i chaqiradi (ikkinchi listener yo'q).
export function updateParallax(root) {
  if (!root || root.dataset.motion === "off") return;
  const vh = window.innerHeight;
  root.querySelectorAll(".px-layer").forEach((layer) => {
    const r = layer.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;
    const offset = r.top + r.height / 2 - vh / 2;
    layer.querySelectorAll("[data-speed]").forEach((el) => {
      const s = Number(el.dataset.speed);
      const rot = Number(el.dataset.rot || 0);
      el.style.transform = `translate3d(0, ${(-offset * s).toFixed(1)}px, 0) rotate(${(rot + offset * s * 0.04).toFixed(2)}deg)`;
    });
  });
}

const Coin = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="30" fill="var(--accent)" />
    <circle
      cx="32"
      cy="32"
      r="22"
      fill="none"
      stroke="var(--bg)"
      strokeWidth="3"
      opacity=".55"
    />
    <text
      x="32"
      y="40"
      textAnchor="middle"
      fontSize="22"
      fontWeight="800"
      fill="var(--bg)"
      fontFamily="Unbounded, sans-serif"
    >
      S
    </text>
  </svg>
);
const Receipt = () => (
  <svg viewBox="0 0 60 84" className="w-full h-full">
    <path
      d="M4 2h52v76l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5L4 78z"
      fill="#fff"
      stroke="var(--ink)"
      strokeOpacity=".15"
    />
    {[16, 26, 36, 46].map((y) => (
      <rect
        key={y}
        x="11"
        y={y}
        width={y === 46 ? 22 : 38}
        height="4"
        rx="2"
        fill="var(--ink)"
        opacity=".22"
      />
    ))}
    <rect x="11" y="58" width="38" height="6" rx="2" fill="var(--accent)" />
  </svg>
);
const Box = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <path d="M32 4 60 18v28L32 60 4 46V18z" fill="var(--accent)" opacity=".9" />
    <path
      d="M32 32 60 18M32 32 4 18M32 32v28"
      stroke="var(--bg)"
      strokeWidth="2.5"
      opacity=".6"
      fill="none"
    />
  </svg>
);
const Barcode = () => (
  <svg viewBox="0 0 70 44" className="w-full h-full">
    <rect width="70" height="44" rx="6" fill="#fff" />
    {[8, 12, 15, 20, 23, 28, 33, 36, 41, 45, 48, 53, 58, 61].map((x, i) => (
      <rect
        key={x}
        x={x}
        y="8"
        width={i % 3 ? 2 : 3}
        height="28"
        fill="var(--ink)"
      />
    ))}
  </svg>
);
const Plane = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="30" fill="#2AABEE" />
    <path d="M15 31 47 18l-6 29-10-8-5 6-1-9 15-13-19 11z" fill="#fff" />
  </svg>
);
const Bag = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <path
      d="M22 22v-4a10 10 0 0 1 20 0v4"
      stroke="var(--ink)"
      strokeWidth="3.5"
      fill="none"
    />
    <path d="M10 22h44l-4 36H14z" fill="var(--accent)" />
  </svg>
);

const SHAPES = {
  coin: Coin,
  receipt: Receipt,
  box: Box,
  barcode: Barcode,
  plane: Plane,
  bag: Bag,
};

// items: [shape, left%, top%, sizePx, speed, rotDeg]
// Kichik buyumlar sekin va xira (orqada), kattalari tez va aniq (oldinda).
export function ParallaxProps({ items }) {
  return (
    <div className="px-layer" aria-hidden="true">
      {items.map(([shape, left, top, size, speed, rot = 0], i) => {
        const Shape = SHAPES[shape];
        const far = size < 44;
        return (
          <span
            key={i}
            data-speed={speed}
            data-rot={rot}
            className={`px-item ${far ? "px-far" : ""}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              transform: `rotate(${rot}deg)`,
            }}
          >
            <Shape />
          </span>
        );
      })}
    </div>
  );
}

// ---------- Osilgan teg: ushlab pastga torting ----------
const PULL_TRIGGER = 110;
const MAX_PULL = 230;

export function PullTag({ to = "/login?register=1" }) {
  const navigate = useNavigate();
  const rigRef = useRef(null);
  const stringRef = useRef(null);
  const st = useRef({
    angle: 0,
    vAngle: 0,
    ext: 0,
    vExt: 0,
    dragging: false,
    done: false,
    moved: false,
    sx: 0,
    sy: 0,
  });

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig || prefersReduced()) return undefined;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            if (visible && !raf) raf = requestAnimationFrame(loop);
          })
        : null;
    io?.observe(rig);

    function loop(now) {
      raf = 0;
      const s = st.current;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!s.dragging && !s.done) {
        // Mayatnik + prujina: burchak va cho'zilish 0 ga qaytadi, ustiga yengil shamol
        const sway = Math.sin(now / 900) * 2.2;
        s.vAngle += (-(s.angle - sway) * 38 - s.vAngle * 4.2) * dt;
        s.angle += s.vAngle * dt;
        s.vExt += (-s.ext * 160 - s.vExt * 11) * dt;
        s.ext += s.vExt * dt;
      }
      rig.style.transform = `rotate(${s.angle.toFixed(2)}deg)`;
      rig.style.setProperty("--ext", `${s.ext.toFixed(1)}px`);
      if (stringRef.current)
        stringRef.current.style.transform = `scaleY(${(1 + s.ext / 150).toFixed(3)})`;
      if (visible && !s.done) raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const onPointerDown = (e) => {
    if (prefersReduced() || e.button > 0) return;
    const s = st.current;
    s.dragging = true;
    s.moved = false;
    s.sx = e.clientX;
    s.sy = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const s = st.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) s.moved = true;
    // Qarshilik: qancha ko'p tortsangiz, shuncha og'irlashadi
    s.ext = MAX_PULL * (1 - Math.exp(-Math.max(0, dy) / MAX_PULL));
    s.angle = Math.max(
      -32,
      Math.min(32, (Math.atan2(dx, 170 + s.ext) * 180) / Math.PI),
    );
    s.vAngle = 0;
    s.vExt = 0;
  };
  const onPointerUp = () => {
    const s = st.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (s.ext > PULL_TRIGGER) {
      s.done = true;
      rigRef.current?.classList.add("tag-dropped");
      setTimeout(() => navigate(to), 420);
    }
  };
  const onClick = (e) => {
    // Sudrash tugaganda tasodifiy click navigatsiya qilmasin
    if (st.current.moved || st.current.done) e.preventDefault();
  };

  return (
    <div className="pull-tag-anchor">
      <div ref={rigRef} className="pull-tag-rig">
        <span ref={stringRef} className="pull-tag-string" aria-hidden="true" />
        <Link
          to={to}
          className="pull-tag"
          aria-label="14 kun bepul sinash — ro'yxatdan o'tish"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          draggable={false}
        >
          <span className="pull-tag-hole" aria-hidden="true" />
          <span className="font-display font-extrabold text-[0.78rem] leading-none tracking-tight whitespace-nowrap">
            Oson<span className="opacity-70">Biznes</span>
          </span>
          <span className="mt-2 text-[0.6rem] font-bold tracking-[0.18em] opacity-80">
            14 KUN BEPUL
          </span>
          <span
            className="mt-4 h-px w-10 bg-current opacity-30"
            aria-hidden="true"
          />
          <span className="mt-2 text-[0.55rem] tracking-[0.14em] opacity-70">
            START · 2026
          </span>
        </Link>
      </div>
      <p className="pull-tag-hint" aria-hidden="true">
        Pastga torting ↓
      </p>
    </div>
  );
}
