import React, { useState } from "react";

// Login sahifasidagi "o'ynasa bo'ladigan" kassa: mahsulotni bosing — chekka chiqadi.
const SHELF = [
  { id: "phone", emoji: "📱", name: "Galaxy A55", price: 4890000 },
  { id: "case", emoji: "🛡️", name: "G'ilof + oyna", price: 85000 },
  { id: "buds", emoji: "🎧", name: "AirPods Pro 2", price: 2650000 },
  { id: "charger", emoji: "🔌", name: "Quvvatlagich 25W", price: 120000 },
  { id: "watch", emoji: "⌚", name: "Casio soat", price: 690000 },
  { id: "perfume", emoji: "🧴", name: "Atir 100 ml", price: 1150000 },
];
const fmt = (n) => n.toLocaleString("ru-RU").replace(/,/g, " ");

export default function InteractiveReceipt() {
  const [lines, setLines] = useState([
    { ...SHELF[0], qty: 1 },
    { ...SHELF[1], qty: 1 },
  ]);
  const [paid, setPaid] = useState(null); // 'naqd' | 'nasiya'
  const [bump, setBump] = useState(0);

  const add = (item) => {
    setPaid(null);
    setBump((b) => b + 1);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === item.id);
      if (i >= 0)
        return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { ...item, qty: 1 }].slice(-5);
    });
  };
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  return (
    <div className="w-full max-w-[22rem]">
      <p className="text-[#334155] text-sm font-medium mb-3">
        Sinab ko'ring: mahsulotni bosing — chek o'zi yoziladi.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {SHELF.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => add(it)}
            className="shelf-btn group rounded-xl bg-white/80 hover:bg-white border border-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition px-2 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#10B981]"
          >
            <span className="text-xl block transition-transform group-hover:-translate-y-0.5 group-active:scale-90">
              {it.emoji}
            </span>
            <span className="block text-[0.75rem] text-[#0F172A] font-semibold mt-1 truncate">
              {it.name}
            </span>
            <span className="block text-[0.6875rem] text-[#64748B]">
              {fmt(it.price)}
            </span>
          </button>
        ))}
      </div>

      <div className="receipt-wrap mx-auto">
        <div className="receipt-slot" />
        <div className="receipt">
          <div className="text-center">
            <p className="font-semibold tracking-wide">SIZNING DO'KONINGIZ</p>
            <p className="opacity-60">Chek #{1040 + lines.length + bump}</p>
          </div>
          <div className="receipt-rule" />
          <ul className="space-y-1 min-h-[6.5rem]" aria-live="polite">
            {lines.map((l) => (
              <li
                key={`${l.id}-${l.qty}`}
                className="receipt-line flex justify-between gap-3"
              >
                <span className="truncate">
                  {l.qty > 1 ? `${l.qty}× ` : ""}
                  {l.name}
                </span>
                <span className="tabular-nums">{fmt(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="receipt-rule" />
          <div className="flex justify-between font-semibold text-[0.9375rem]">
            <span>JAMI</span>
            <span key={total} className="tabular-nums price-swap">
              {fmt(total)} so'm
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-body">
            <button
              type="button"
              onClick={() => setPaid("naqd")}
              className="rounded-md border border-[#1E293B]/20 py-1.5 text-[0.75rem] font-bold hover:bg-[#1E293B] hover:text-white transition-colors"
            >
              Naqd
            </button>
            <button
              type="button"
              onClick={() => setPaid("nasiya")}
              className="rounded-md border border-[#B4231B]/40 text-[#B4231B] py-1.5 text-[0.75rem] font-bold hover:bg-[#B4231B] hover:text-white transition-colors"
            >
              Nasiya
            </button>
          </div>
          <div className="receipt-barcode" />
          <div
            className={`receipt-stamp ${paid ? "is-on" : ""}`}
            style={
              paid === "naqd"
                ? { color: "#0F172A", borderColor: "#0F172A" }
                : undefined
            }
          >
            {paid === "naqd" ? (
              <>
                To'landi
                <br />
                qoldiq yangilandi
              </>
            ) : (
              <>
                Nasiya daftariga
                <br />
                yozildi
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
