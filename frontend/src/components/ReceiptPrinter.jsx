import React, { useEffect, useState } from "react";

// Jonli "chop etilayotgan" termal chek — landing va login sahifasining asosiy vizuali.
const ITEMS = [
  { name: "Galaxy A55 128GB", price: 4890000 },
  { name: "G'ilof + himoya oyna", price: 85000 },
  { name: "Quvvatlagich 25W", price: 120000 },
];
const TOTAL = ITEMS.reduce((s, i) => s + i.price, 0);
const fmt = (n) => n.toLocaleString("ru-RU").replace(/,/g, " ");

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ReceiptPrinter({ className = "" }) {
  // 0..ITEMS.length — chiqqan qatorlar; +1 jami; +2 nasiya muhri
  const final = ITEMS.length + 2;
  const [step, setStep] = useState(() => (prefersReduced() ? final : 0));

  useEffect(() => {
    if (prefersReduced()) return undefined;
    const delay = step === 0 ? 700 : step < final ? 650 : 4200;
    const t = setTimeout(() => setStep((s) => (s >= final ? 0 : s + 1)), delay);
    return () => clearTimeout(t);
  }, [step, final]);

  const shown = ITEMS.slice(0, Math.min(step, ITEMS.length));
  const running = shown.reduce((s, i) => s + i.price, 0);
  const showTotal = step > ITEMS.length;
  const showStamp = step > ITEMS.length + 1;

  return (
    <div
      className={`receipt-wrap ${className}`}
      aria-label="Namuna chek: 69 500 so'm, nasiyaga yozildi"
    >
      <div className="receipt-slot" />
      <div className="receipt">
        <div className="text-center">
          <p className="font-semibold tracking-wide">MALIKA MOBILE</p>
          <p className="opacity-60">Malika, 214-do'kon</p>
          <p className="opacity-60">Chek #1042 &nbsp; 18:42</p>
        </div>
        <div className="receipt-rule" />
        <ul className="space-y-1 min-h-[5.5rem]">
          {shown.map((i) => (
            <li
              key={i.name}
              className="receipt-line flex justify-between gap-3"
            >
              <span className="truncate">{i.name}</span>
              <span className="tabular-nums">{fmt(i.price)}</span>
            </li>
          ))}
        </ul>
        <div className="receipt-rule" />
        <div className="flex justify-between font-semibold text-[0.9375rem]">
          <span>JAMI</span>
          <span className="tabular-nums">
            {fmt(showTotal ? TOTAL : running)} so'm
          </span>
        </div>
        <div
          className={`mt-2 transition-opacity duration-300 ${showTotal ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex justify-between opacity-70">
            <span>To'lov</span>
            <span>Nasiya</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Mijoz</span>
            <span>Dilnoza opa</span>
          </div>
          <div className="flex justify-between opacity-70">
            <span>Qaytarish</span>
            <span>15-noyabr</span>
          </div>
        </div>
        <div className="receipt-barcode" />
        <p className="text-center opacity-50 text-[0.625rem]">
          Xaridingiz uchun rahmat!
        </p>
        <div className={`receipt-stamp ${showStamp ? "is-on" : ""}`}>
          Nasiya daftariga
          <br />
          yozildi
        </div>
      </div>
    </div>
  );
}
