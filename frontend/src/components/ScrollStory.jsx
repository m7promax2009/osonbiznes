import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ---------- Scroll'ga bog'langan 3D hikoya (three.js) ----------
// Sahna: osilgan teg aylanib yo'qoladi -> 3 telefon tushib "OSON" harflari
// orasiga joylashadi -> Kassa (tangalar) -> NASIYA (cheklar) -> hammasi
// sumkaga tushadi. Hamma narsa bitta sticky stage ichida, p = 0..1 scroll
// progressidan deterministik hisoblanadi (orqaga scroll ham to'g'ri ishlaydi).

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const back = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

const WORD = ["O", "S", "O", "N"];
const FRONT = new Set([1, 3]); // shu harflar telefonlar OLDIDA turadi

const BG_KEYS = [
  [0, "#f4f1ec"],
  [0.4, "#f4f1ec"],
  [0.47, "#f6e2c2"],
  [0.61, "#f6e2c2"],
  [0.67, "#fcd3d8"],
  [0.79, "#fcd3d8"],
  [0.85, "#e6f2ea"],
  [1, "#e6f2ea"],
];

const SCREENS = ["dash", "pos", "customers", "telegram"];

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function canvasTex(THREE, w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Telefon ekrani: status bar + ilova skrinshoti, burchaklari yumaloq
function screenTex(THREE, img) {
  return canvasTex(THREE, 512, 1060, (ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, 62);
    ctx.clip();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    if (img) ctx.drawImage(img, 0, 76, w, (w * img.height) / img.width);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, 76);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 26px -apple-system, Inter, sans-serif";
    ctx.fillText("9:41", 52, 50);
    ctx.fillRect(w - 98, 30, 44, 20);
    ctx.fillStyle = "#000";
    roundRect(ctx, w / 2 - 70, 18, 140, 40, 20);
    ctx.fill();
  });
}

function backTex(THREE) {
  return canvasTex(THREE, 512, 1060, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1f2a26");
    g.addColorStop(1, "#0b1210");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#151b19";
    roundRect(ctx, 34, 34, 210, 210, 52);
    ctx.fill();
    ctx.fillStyle = "#050807";
    for (const [x, y] of [
      [92, 92],
      [186, 92],
      [92, 186],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#34d399";
    ctx.font = "800 64px Unbounded, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Oson", w / 2, h / 2 + 30);
  });
}

function tagTex(THREE) {
  return canvasTex(THREE, 512, 860, (ctx, w, h) => {
    ctx.fillStyle = "#047857";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f4f1ec";
    ctx.beginPath();
    ctx.arc(w / 2, 86, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 96px Unbounded, Inter, sans-serif";
    ctx.fillText("Oson", w / 2, 330);
    ctx.globalAlpha = 0.75;
    ctx.fillText("Biznes", w / 2, 440);
    ctx.globalAlpha = 0.9;
    ctx.font = "700 40px Inter, sans-serif";
    ctx.fillText("14 KUN BEPUL", w / 2, 560);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(w / 2 - 60, 620, 120, 3);
    ctx.globalAlpha = 0.7;
    ctx.font = "600 32px Inter, sans-serif";
    ctx.fillText("START · 2026", w / 2, 700);
  });
}

function coinTex(THREE) {
  return canvasTex(THREE, 256, 256, (ctx, w) => {
    const g = ctx.createRadialGradient(90, 80, 10, w / 2, w / 2, w / 2);
    g.addColorStop(0, "#fff1b8");
    g.addColorStop(0.5, "#e8b84a");
    g.addColorStop(1, "#a8741a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = "rgba(120,80,10,.55)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(110,70,5,.75)";
    ctx.font = "800 120px Unbounded, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", w / 2, w / 2 + 6);
  });
}

function receiptTex(THREE, i) {
  return canvasTex(THREE, 360, 600, (ctx, w, h) => {
    ctx.fillStyle = "#fffdf8";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    for (let x = w, k = 0; x >= 0; x -= 15, k++) {
      ctx.lineTo(x, k % 2 === 0 ? h - 22 : h);
    }
    ctx.lineTo(0, h - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 30px Inter, sans-serif";
    ctx.fillText("OsonBiznes", 28, 58);
    ctx.font = "500 20px Menlo, monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`Chek #${1042 + i * 7}`, 28, 92);
    ctx.fillStyle = "#cbd5e1";
    for (let k = 0; k < 4; k++)
      ctx.fillRect(28, 130 + k * 34, k === 3 ? 160 : 300, 12);
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 30px Inter, sans-serif";
    ctx.fillText("Jami", 28, 318);
    ctx.textAlign = "right";
    ctx.fillText(["245 000", "1 180 000", "86 500"][i % 3], w - 28, 318);
    ctx.textAlign = "left";
    for (let x = 28, k = 0; x < w - 28; k++) {
      const bw = [3, 6, 2, 4][k % 4];
      ctx.fillRect(x, 360, bw, 110);
      x += bw + [3, 4, 5, 3][(k * 7) % 4];
    }
    if (i !== 1) {
      ctx.save();
      ctx.translate(250, 225);
      ctx.rotate(-0.25);
      ctx.strokeStyle = "#dc2626";
      ctx.fillStyle = "#dc2626";
      ctx.lineWidth = 5;
      roundRect(ctx, -70, -34, 140, 68, 12);
      ctx.stroke();
      ctx.font = "800 38px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i === 0 ? "−15%" : "NASIYA", 0, 2);
      ctx.restore();
    }
  });
}

function bagTex(THREE) {
  return canvasTex(THREE, 512, 580, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0d3b2b");
    g.addColorStop(1, "#072319");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fillRect(0, 0, w, 26);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 92px Unbounded, Inter, sans-serif";
    ctx.fillText("Oson", w / 2, h / 2 + 10);
    ctx.globalAlpha = 0.7;
    ctx.font = "700 46px Unbounded, Inter, sans-serif";
    ctx.fillText("Biznes", w / 2, h / 2 + 80);
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

export default function ScrollStory() {
  const secRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const reduced = prefersReduced();

  useEffect(() => {
    if (reduced) return undefined;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let THREE;
      let RoundedBoxGeometry;
      let RoomEnvironment;
      try {
        THREE = await import("three");
        ({ RoundedBoxGeometry } =
          await import("three/examples/jsm/geometries/RoundedBoxGeometry.js"));
        ({ RoomEnvironment } =
          await import("three/examples/jsm/environments/RoomEnvironment.js"));
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;

      const canvas = canvasRef.current;
      const stage = stageRef.current;
      const sec = secRef.current;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 5, 6);
      scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));

      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 12);

      // --- Materiallar / geometriyalar (bir marta, qayta ishlatiladi)
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0x23262b,
        metalness: 0.85,
        roughness: 0.28,
        clearcoat: 0.6,
      });
      const phoneGeo = new RoundedBoxGeometry(1, 2.04, 0.11, 6, 0.13);
      const screenGeo = new THREE.PlaneGeometry(0.92, 0.92 * (1060 / 512));
      const backT = backTex(THREE);
      const backMat = new THREE.MeshPhysicalMaterial({
        map: backT,
        metalness: 0.3,
        roughness: 0.35,
        clearcoat: 1,
        transparent: true,
      });

      const imgs = await Promise.all(
        SCREENS.map((n) => loadImage(`/images/story/${n}.webp`)),
      );
      if (disposed) {
        renderer.dispose();
        return;
      }
      const screenTexs = imgs.map((im) => screenTex(THREE, im));

      function makePhone(texIdx) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(phoneGeo, bodyMat));
        const scrMat = new THREE.MeshBasicMaterial({
          map: screenTexs[texIdx],
          transparent: true,
          toneMapped: false,
        });
        const scr = new THREE.Mesh(screenGeo, scrMat);
        scr.position.z = 0.0565;
        g.add(scr);
        const bk = new THREE.Mesh(screenGeo, backMat);
        bk.position.z = -0.0565;
        bk.rotation.y = Math.PI;
        g.add(bk);
        g.userData.scrMat = scrMat;
        scene.add(g);
        return g;
      }
      const phones = [makePhone(1), makePhone(0), makePhone(2)];
      const hero = phones[1];

      // Teg
      const pivot = new THREE.Group();
      const tagT = tagTex(THREE);
      const tagGroup = new THREE.Group();
      const tagBody = new THREE.Mesh(
        new RoundedBoxGeometry(0.9, 1.5, 0.03, 4, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.6 }),
      );
      const tagFaceGeo = new THREE.PlaneGeometry(0.86, 0.86 * (860 / 512));
      const tagFaceMat = new THREE.MeshStandardMaterial({
        map: tagT,
        roughness: 0.55,
      });
      const tf = new THREE.Mesh(tagFaceGeo, tagFaceMat);
      tf.position.z = 0.016;
      const tb = new THREE.Mesh(tagFaceGeo, tagFaceMat);
      tb.position.z = -0.016;
      tb.rotation.y = Math.PI;
      tagGroup.add(tagBody, tf, tb);
      const stringMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.8,
      });
      const string = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 1, 6),
        stringMat,
      );
      pivot.add(string, tagGroup);
      scene.add(pivot);

      // Tangalar
      const coinT = coinTex(THREE);
      const goldSide = new THREE.MeshStandardMaterial({
        color: 0xd9a63a,
        metalness: 1,
        roughness: 0.32,
      });
      const goldFace = new THREE.MeshStandardMaterial({
        map: coinT,
        metalness: 0.9,
        roughness: 0.3,
      });
      const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 48);
      const COINS = [
        [-1.15, 0.7, 0.4],
        [1.05, 0.95, -0.6],
        [-0.95, -0.75, 0.8],
        [1.2, -0.5, 0.2],
        [-0.2, 1.25, -0.2],
        [0.35, -1.25, 0.5],
        [-1.45, 0.05, -0.4],
      ];
      const coins = COINS.map(() => {
        const m = new THREE.Mesh(coinGeo, [goldSide, goldFace, goldFace]);
        scene.add(m);
        return m;
      });

      // Cheklar
      const receiptGeo = new THREE.PlaneGeometry(0.62, 0.62 * (600 / 360));
      const receipts = [0, 1, 2].map((i) => {
        const m = new THREE.Mesh(
          receiptGeo,
          new THREE.MeshStandardMaterial({
            map: receiptTex(THREE, i),
            side: THREE.DoubleSide,
            alphaTest: 0.5,
            roughness: 0.9,
          }),
        );
        scene.add(m);
        return m;
      });

      // Sumka
      const bagT = bagTex(THREE);
      const paper = new THREE.MeshStandardMaterial({
        color: 0x0a3022,
        roughness: 0.85,
      });
      const inside = new THREE.MeshStandardMaterial({
        color: 0x041a12,
        roughness: 1,
      });
      const bagFace = new THREE.MeshStandardMaterial({
        map: bagT,
        roughness: 0.8,
      });
      const bag = new THREE.Group();
      const bagBox = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.9, 0.75), [
        paper,
        paper,
        inside,
        paper,
        bagFace,
        bagFace,
      ]);
      bag.add(bagBox);
      const handleGeo = new THREE.TorusGeometry(0.36, 0.03, 10, 40, Math.PI);
      const handleMat = new THREE.MeshStandardMaterial({
        color: 0xe8dcc4,
        roughness: 0.7,
      });
      for (const z of [0.3, -0.3]) {
        const h = new THREE.Mesh(handleGeo, handleMat);
        h.position.set(0, 0.95, z);
        bag.add(h);
      }
      scene.add(bag);

      // --- O'lchamlar
      let W = 1;
      let H = 1;
      let halfH = 1;
      let halfW = 1;
      let mobile = false;
      let gapX = [-1, 0, 1];
      const toWorldX = (px) => ((px - W / 2) / (W / 2)) * halfW;

      function measure() {
        W = stage.clientWidth;
        H = stage.clientHeight;
        mobile = W / H < 0.85;
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2),
        );
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        halfH =
          Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.position.z;
        halfW = halfH * camera.aspect;
        const word = backRef.current;
        if (word) {
          const spans = word.querySelectorAll("span");
          const xs = [];
          const base = word.offsetLeft - word.offsetWidth / 2;
          for (let i = 0; i < spans.length - 1; i++) {
            const a = spans[i];
            const b = spans[i + 1];
            const right = base + a.offsetLeft + a.offsetWidth;
            const left = base + b.offsetLeft;
            xs.push(toWorldX((right + left) / 2));
          }
          if (xs.length === 3) gapX = xs;
        }
      }
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(stage);

      const copies = [...stage.querySelectorAll("[data-k]")];
      const copyEl = (k) => copies.find((c) => c.dataset.k === k);
      const cTag = copyEl("tag");
      const cWord = copyEl("word");
      const cKassa = copyEl("kassa");
      const cNasiya = copyEl("nasiya");
      const cNas = copyEl("nasword");
      const cBag = copyEl("bag");
      const show = (el, o, dy = 0) => {
        if (!el) return;
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
        el.style.transform = `translate3d(0, ${((1 - o) * dy).toFixed(1)}px, 0)`;
      };

      const cA = new THREE.Color();
      const cB = new THREE.Color();
      function bgAt(p) {
        let i = 0;
        while (i < BG_KEYS.length - 2 && p > BG_KEYS[i + 1][0]) i++;
        const [p0, c0] = BG_KEYS[i];
        const [p1, c1] = BG_KEYS[i + 1];
        cA.set(c0);
        cB.set(c1);
        cA.lerp(cB, ease(seg(p, p0, p1)));
        return `#${cA.getHexString()}`;
      }

      // --- Har kadr: p (scroll) + t (vaqt) -> sahna
      function frame(p, t) {
        stage.style.backgroundColor = bgAt(p);
        const U = Math.min(halfW * (mobile ? 0.95 : 0.5), halfH);
        const phoneH = (s) => s / 2.04; // dunyo balandligi -> scale

        // Kadrlar uchun pozitsiyalar (desktop / mobil)
        const kassaPos = mobile
          ? [0, -halfH * 0.3]
          : [halfW * 0.38, -halfH * 0.02];
        const bagPos = mobile
          ? [0, -halfH * 0.5]
          : [halfW * 0.36, -halfH * 0.22];
        const kassaScale = phoneH(mobile ? halfH * 0.85 : halfH * 1.15);
        const nasScale = phoneH(mobile ? halfH * 0.6 : halfH * 1.05);

        // ---- Teg
        const tagOn = p < 0.165;
        pivot.visible = tagOn;
        if (tagOn) {
          const L = halfH * 0.62;
          const s = Math.min(1.1, halfH * 0.32);
          pivot.position.set(mobile ? 0 : halfW * 0.0, halfH + 0.05, 0.5);
          string.scale.y = L;
          string.position.y = -L / 2;
          tagGroup.scale.setScalar(s);
          tagGroup.position.y = -L - 0.72 * s;
          const k = ease(seg(p, 0.03, 0.15));
          pivot.rotation.z = Math.sin(t * 1.3) * 0.07 * (1 - k);
          tagGroup.rotation.y = lerp(
            Math.sin(t * 0.7) * 0.45 - 0.2,
            Math.PI / 2,
            k,
          );
          tagGroup.rotation.x = Math.sin(t * 0.9) * 0.05;
          pivot.position.y += easeOut(seg(p, 0.13, 0.165)) * halfH * 0.6;
        }

        // ---- Telefonlar: tushish -> OSON orasida -> chiqish
        const TILT = [0.3, -0.1, -0.24];
        const YAW = [-0.35, 0.2, 0.45];
        const wordScale = phoneH(mobile ? halfH * 0.3 : halfH * 1.0);
        const exit = ease(seg(p, 0.36, 0.45));
        phones.forEach((ph, i) => {
          const d = back(seg(p, 0.13 + i * 0.03, 0.235 + i * 0.03));
          const din = seg(p, 0.13 + i * 0.03, 0.235 + i * 0.03);
          const idle = Math.sin(t * 1.1 + i * 2) * 0.04;
          let x = gapX[i];
          let y = lerp(halfH * 1.8, -halfH * 0.04 + idle, d);
          let rz = TILT[i];
          let ry = lerp(YAW[i] + Math.PI * 2, YAW[i], easeOut(din));
          let s = wordScale;
          if (ph !== hero) {
            const dir = i === 0 ? -1 : 1;
            x = lerp(x, dir * halfW * 1.7, exit);
            y = lerp(y, halfH * 1.1, exit);
            rz += dir * exit * 1.2;
            ph.visible = p > 0.12 && exit < 1;
          } else {
            ph.visible = p > 0.12;
          }
          ph.position.set(x, y, 0);
          ph.rotation.set(0, ry, rz);
          ph.scale.setScalar(s);
        });

        // Hero telefon: Kassa -> NASIYA -> sumka
        if (p > 0.36) {
          const k1 = ease(seg(p, 0.36, 0.47));
          const k2 = ease(seg(p, 0.61, 0.7));
          const k3 = ease(seg(p, 0.8, 0.88));
          const drop = ease(seg(p, 0.87, 0.93));
          const idle = Math.sin(t * 1.2) * 0.06;
          let x = lerp(gapX[1], kassaPos[0], k1);
          let y = lerp(-halfH * 0.04, kassaPos[1] + idle, k1);
          let s = lerp(wordScale, kassaScale, k1);
          let ry =
            YAW[1] +
            k1 * Math.PI * 2 -
            0.35 * k1 +
            Math.sin(t * 0.8) * 0.12 * k1;
          let rz = lerp(TILT[1], -0.08, k1);
          // NASIYA: markazda, yozuv orasida
          x = lerp(x, 0, k2);
          y = lerp(y, (mobile ? -halfH * 0.05 : -halfH * 0.03) + idle, k2);
          s = lerp(s, nasScale, k2);
          ry += k2 * Math.PI * 2 + Math.sin(t * 0.9) * 0.25 * k2;
          rz = lerp(rz, 0.06, k2);
          // Sumka ustiga, keyin ichiga
          const bagTop = bagPos[1] + U * 0.47;
          x = lerp(x, bagPos[0], k3);
          y = lerp(y, bagTop + U * 0.75, k3);
          s = lerp(s, phoneH(U * 0.95), k3);
          rz = lerp(rz, -0.18, k3);
          y = lerp(y, bagPos[1] - U * 0.1, drop);
          ry = lerp(ry, Math.PI * 4 - 0.35, k3);
          hero.position.set(x, y, lerp(0, 0.05, k3));
          hero.scale.setScalar(s);
          hero.rotation.set(0, ry, rz);
          hero.visible = drop < 0.999;
          // Ekran almashadi telefon orqasi bilan qaragan paytda
          const idx = p < 0.415 ? 0 : p < 0.655 ? 1 : 2;
          if (hero.userData.scrMat.map !== screenTexs[idx]) {
            hero.userData.scrMat.map = screenTexs[idx];
          }
        } else if (hero.userData.scrMat.map !== screenTexs[0]) {
          hero.userData.scrMat.map = screenTexs[0];
        }

        // ---- Tangalar (Kassa)
        const cIn = easeOut(seg(p, 0.44, 0.52));
        const cOut = ease(seg(p, 0.59, 0.66));
        coins.forEach((m, i) => {
          const [cx, cy, cz] = COINS[i];
          const r = U * 0.75;
          const tx = kassaPos[0] + cx * r + Math.sin(t * 0.8 + i) * 0.08;
          const ty = kassaPos[1] + cy * r + Math.cos(t * 0.7 + i * 1.3) * 0.1;
          m.position.set(
            lerp(kassaPos[0], tx, cIn),
            lerp(kassaPos[1], ty, cIn) + cOut * halfH * (1.4 + i * 0.1),
            cz + 0.6,
          );
          m.rotation.set(
            Math.PI / 2 + t * (0.6 + i * 0.1) + i,
            t * 0.4 + i,
            0.3 * i,
          );
          m.scale.setScalar(U * 0.38 * cIn);
          m.visible = cIn > 0.01 && cOut < 1;
        });

        // ---- Cheklar: NASIYA'da suzadi, keyin sumkaga tushadi
        const rIn = easeOut(seg(p, 0.66, 0.73));
        const RPOS = mobile
          ? [
              [-0.62, 0.5],
              [0.62, 0.38],
              [-0.5, -0.62],
            ]
          : [
              [-0.55, 0.42],
              [0.58, 0.48],
              [0.6, -0.5],
            ];
        receipts.forEach((m, i) => {
          const [rx, ry0] = RPOS[i];
          const fx = rx * halfW + Math.sin(t * 0.9 + i * 2) * 0.1;
          const fy = ry0 * halfH + Math.cos(t * 0.8 + i) * 0.12;
          let x = lerp(rx * halfW * 1.6, fx, rIn);
          let y = lerp(fy - halfH * 0.4, fy, rIn);
          let rz = Math.sin(t * 0.7 + i) * 0.25 + (i - 1) * 0.3;
          let ryy = Math.sin(t * 0.6 + i * 1.7) * 0.6;
          let s = U * 0.55;
          const a = 0.88 + i * 0.03;
          const k = ease(seg(p, a, a + 0.05));
          const dk = ease(seg(p, a + 0.035, a + 0.075));
          const bagTop = bagPos[1] + U * 0.47;
          x = lerp(x, bagPos[0] + (i - 1) * U * 0.1, k);
          y = lerp(y, bagTop + U * 0.6, k);
          rz = lerp(rz, (i - 1) * 0.2, k);
          ryy = lerp(ryy, -0.35, k);
          s = lerp(s, U * 0.6, k);
          y = lerp(y, bagPos[1] - U * 0.3, dk);
          m.position.set(x, y, lerp(0.8, 0, k));
          m.rotation.set(0, ryy, rz);
          m.scale.setScalar(s);
          m.visible = rIn > 0.01 && dk < 0.999;
        });

        // ---- Sumka
        const bIn = back(seg(p, 0.8, 0.88));
        bag.visible = p > 0.8;
        const land = [0.92, 0.95, 0.98, 1.01].reduce(
          (acc, a) => acc + Math.max(0, 1 - Math.abs(p - a) / 0.012),
          0,
        );
        bag.position.set(bagPos[0], lerp(-halfH * 1.8, bagPos[1], bIn), 0);
        bag.scale.setScalar(U * 0.5 * (1 - land * 0.04));
        bag.rotation.set(0.08, -0.35 + Math.sin(t * 0.6) * 0.06, land * 0.04);

        // ---- HTML qatlamlar
        show(cTag, 1 - seg(p, 0.02, 0.08), 20);
        const wIn = seg(p, 0.17, 0.27);
        const wordO = wIn * (1 - exit);
        const ink = new THREE.Color("#d8d2c8").lerp(
          new THREE.Color("#10261c"),
          ease(seg(p, 0.24, 0.32)),
        );
        for (const el of [backRef.current, frontRef.current]) {
          if (!el) continue;
          el.style.opacity = wordO.toFixed(3);
          el.style.visibility = wordO < 0.01 ? "hidden" : "visible";
          el.style.color = `#${ink.getHexString()}`;
          el.style.transform = `translate3d(-50%, -50%, 0) scale(${(lerp(0.92, 1, ease(wIn)) + exit * 1.2).toFixed(3)})`;
        }
        show(cWord, seg(p, 0.27, 0.31) * (1 - seg(p, 0.35, 0.39)), 24);
        show(cKassa, seg(p, 0.47, 0.51) * (1 - seg(p, 0.59, 0.62)), 30);
        const nIn = ease(seg(p, 0.64, 0.7));
        const nOut = seg(p, 0.78, 0.82);
        if (cNas) {
          cNas.style.opacity = (nIn * (1 - nOut)).toFixed(3);
          cNas.style.visibility =
            nIn * (1 - nOut) < 0.01 ? "hidden" : "visible";
          const spread = lerp(28, 0, nIn) + nOut * 18;
          const [l, r] = cNas.children;
          if (l) l.style.transform = `translate3d(${-spread}vw,0,0)`;
          if (r) r.style.transform = `translate3d(${spread}vw,0,0)`;
        }
        show(cNasiya, seg(p, 0.69, 0.73) * (1 - nOut), 24);
        show(cBag, mobile ? seg(p, 0.915, 0.945) : seg(p, 0.86, 0.9), 30);

        renderer.render(scene, camera);
      }

      // --- Loop: faqat bo'lim ko'rinib turganda
      let raf = 0;
      let visible = false;
      const t0 = performance.now();
      const progress = () => {
        const r = sec.getBoundingClientRect();
        return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      };
      const loop = () => {
        raf = 0;
        if (!visible || disposed) return;
        frame(progress(), (performance.now() - t0) / 1000);
        raf = requestAnimationFrame(loop);
      };
      const io = new IntersectionObserver(
        ([e]) => {
          visible = e.isIntersecting;
          if (visible && !raf) raf = requestAnimationFrame(loop);
        },
        { rootMargin: "200px 0px" },
      );
      io.observe(sec);
      // Test/yozib olish uchun deterministik kadr
      window.__storyFrame = (p, t = 0) => frame(p, t);
      frame(progress(), 0);

      cleanup = () => {
        io.disconnect();
        ro.disconnect();
        if (raf) cancelAnimationFrame(raf);
        delete window.__storyFrame;
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          const mats = Array.isArray(o.material)
            ? o.material
            : o.material
              ? [o.material]
              : [];
          mats.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        });
        screenTexs.forEach((tx) => tx.dispose());
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
      if (disposed) cleanup();
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [reduced]);

  if (reduced || failed) return null;

  return (
    <section
      ref={secRef}
      className="story"
      aria-label="OsonBiznes: kassa, nasiya va Telegram — bitta ilovada"
    >
      <div ref={stageRef} className="story-stage">
        <div
          ref={backRef}
          className="story-word font-display"
          aria-hidden="true"
        >
          {WORD.map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
        <canvas ref={canvasRef} className="story-canvas" aria-hidden="true" />
        <div
          ref={frontRef}
          className="story-word story-word-front font-display"
          aria-hidden="true"
        >
          {WORD.map((c, i) => (
            <span
              key={i}
              style={{ visibility: FRONT.has(i) ? "visible" : "hidden" }}
            >
              {c}
            </span>
          ))}
        </div>

        <p data-k="tag" className="story-hint">
          Pastga aylantiring ↓
        </p>
        <div data-k="word" className="story-copy story-copy-word">
          <p className="font-display font-extrabold text-xl sm:text-2xl leading-tight">
            Do'kon hisobi —<br />
            cho'ntagingizda.
          </p>
        </div>
        <div data-k="kassa" className="story-copy story-copy-side">
          <p className="story-eyebrow">01 · Kassa</p>
          <h2 className="font-display font-extrabold story-title">Kassa</h2>
          <p className="story-text">
            Shtrix-kod, bitta tugma. Sotuv o'zi yoziladi, ombor o'zi kamayadi.
          </p>
        </div>
        <div
          data-k="nasword"
          className="story-nasiya font-display"
          aria-hidden="true"
        >
          <span>NAS</span>
          <span>IYA</span>
        </div>
        <div data-k="nasiya" className="story-copy story-copy-bottom">
          <p className="story-eyebrow">02 · Nasiya daftari</p>
          <p className="story-text">
            Kim qancha qarz — hammasi yozilgan. Muddati kelsa, Telegram'da
            eslatadi.
          </p>
        </div>
        <div data-k="bag" className="story-copy story-copy-side">
          <p className="story-eyebrow">03 · Hammasi</p>
          <h2 className="font-display font-extrabold story-title">
            Hammasi bitta
            <br />
            ilovada.
          </h2>
          <p className="story-text">
            Kassa, nasiya, ombor va Telegram buyurtmalar — bitta cho'ntakda.
          </p>
          <Link
            to="/login?register=1"
            className="mt-6 inline-flex items-center rounded-full bg-[#047857] px-7 py-4 font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#065f46]"
          >
            14 kun bepul sinash
          </Link>
        </div>
      </div>
    </section>
  );
}
