"""
OsonBiznes sotuv agenti uchun MCP server (Hermes `mcp-osonbiznes` toolset).

Agentga FAQAT shu yerdagi toollar beriladi — terminal, fayl tizimi, brauzer yo'q.
Har bir tool OsonBiznes'ning OCHIQ (autentifikatsiyasiz) API'siga murojaat qiladi,
shuning uchun agent hech qachon do'kon egalarining shaxsiy ma'lumotini ko'ra olmaydi
va hech kimning tarifini o'zgartira olmaydi.

Muhit o'zgaruvchilari:
  OSONBIZNES_API_URL   masalan https://api.osonbiznes.uz/api   (default: http://localhost:5001/api)
  OSONBIZNES_SITE_URL  masalan https://osonbiznes.uz           (default: http://localhost:3055)
  OSONBIZNES_AGENT_KEY backend AGENT_API_KEY bilan bir xil (ixtiyoriy, kamida 24 belgi)
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer

API_URL = os.getenv("OSONBIZNES_API_URL", "http://localhost:5001/api").rstrip("/")
SITE_URL = os.getenv("OSONBIZNES_SITE_URL", "http://localhost:3055").rstrip("/")
# Backend'dagi AGENT_API_KEY bilan bir xil — support murojaatlari uchun alohida limit beradi
AGENT_KEY = os.getenv("OSONBIZNES_AGENT_KEY", "")
TIMEOUT = httpx.Timeout(10.0)

server = MCPServer(
    name="osonbiznes",
    instructions="OsonBiznes CRM tariflari, ro'yxatdan o'tish va qo'llab-quvvatlash uchun toollar.",
)


def _fmt(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " so'm"


async def _get(path: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{API_URL}{path}")
        r.raise_for_status()
        return r.json()


@server.tool(description="OsonBiznes tariflari: narxlar (oylik/yillik), imkoniyatlar va bepul sinov muddati.")
async def get_plans() -> str:
    try:
        data = (await _get("/subscription/plans"))["data"]
    except Exception as exc:  # noqa: BLE001 — agentga tushunarli xabar qaytaramiz
        return f"Tariflarni olib bo'lmadi ({type(exc).__name__}). Mijozga saytdan ko'rishni taklif qiling: {SITE_URL}"
    lines = [f"Bepul sinov: {data['trialDays']} kun, karta talab qilinmaydi."]
    for p in data["plans"]:
        lines.append(
            f"- {p['name']}: {_fmt(p['monthly'])}/oy yoki {_fmt(p['yearly'])}/yil (-20%). "
            f"Imkoniyatlar: {', '.join(p['features'])}"
        )
    return "\n".join(lines)


@server.tool(description="Ro'yxatdan o'tish havolasi. Mijoz shu havola orqali o'zi ro'yxatdan o'tadi (parolni chatda SO'RAMANG).")
async def get_signup_link() -> str:
    return f"{SITE_URL}/login?register=1"


@server.tool(
    description=(
        "Obuna uchun qanday to'lash kerakligi bo'yicha qadam-baqadam yo'riqnoma. "
        "plan: start | pro | business; billing_cycle: monthly | yearly."
    )
)
async def get_payment_instructions(plan: str = "pro", billing_cycle: str = "monthly") -> str:
    plan = plan.lower().strip()
    if plan not in {"start", "pro", "business"}:
        return "Noma'lum tarif. Mavjudlari: start, pro, business."
    cycle = "yillik" if billing_cycle == "yearly" else "oylik"
    return (
        f"{plan.capitalize()} ({cycle}) tarifini sotib olish:\n"
        f"1) {SITE_URL}/login?register=1 orqali ro'yxatdan o'ting (14 kun bepul sinov darhol boshlanadi).\n"
        f"2) Kabinetda 'Obuna' bo'limiga kiring va {plan.capitalize()} tarifida 'Sotib olish'ni bosing.\n"
        "3) Ko'rsatilgan kartaga Click/Payme yoki bank ilovasi orqali o'tkazing.\n"
        "4) 'To'ladim' tugmasini bosing — admin tekshirgach tarif avtomatik yoqiladi va bildirishnoma keladi.\n"
        "Eslatma: karta raqami, SMS-kod yoki parolni hech qachon chatga yozmang."
    )


@server.tool(description="OsonBozor marketplace'ning haqiqiy statistikasi (do'konlar, mahsulotlar soni) — ishonch uchun.")
async def get_platform_stats() -> str:
    try:
        d = (await _get("/marketplace/stats"))["data"]
    except Exception as exc:  # noqa: BLE001
        return f"Statistika hozir mavjud emas ({type(exc).__name__})."
    return (
        f"OsonBozor'da hozir {d['totalShops']} ta do'kon, {d['totalProducts']} ta mahsulot, "
        f"{d['totalCategories']} ta kategoriya bor."
    )


@server.tool(
    description=(
        "Mijoz murojaatini OsonBiznes adminiga yuborish (savol, demo so'rovi, muammo). "
        "contact — mijoz rozilik bilan bergan telefon yoki @username."
    )
)
async def contact_support(subject: str, message: str, contact: str = "") -> str:
    subject = subject.strip()[:150]
    body = message.strip()[:1800]
    if not subject or not body:
        return "Mavzu va xabar bo'sh bo'lmasligi kerak."
    if contact:
        body = f"{body}\n\nAloqa: {contact.strip()[:100]} (Telegram sotuv agenti orqali)"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            headers = {"x-agent-key": AGENT_KEY} if AGENT_KEY else {}
            r = await client.post(f"{API_URL}/support", json={"subject": subject, "message": body}, headers=headers)
        if r.status_code == 429:
            return "Juda ko'p murojaat yuborildi, birozdan keyin qayta urinib ko'ring."
        r.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        return f"Murojaat yuborilmadi ({type(exc).__name__}). Mijozga saytdagi 'Admin bilan bog'lanish' tugmasini taklif qiling."
    return "Murojaat adminga yuborildi. Admin tez orada bog'lanadi."


if __name__ == "__main__":
    server.run("stdio")
