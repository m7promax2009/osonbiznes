#!/usr/bin/env bash
# OsonBiznes sotuv agentini alohida Hermes profiliga o'rnatadi.
#
#   bash agent/install.sh                       # lokal test (API: localhost)
#   OSONBIZNES_API_URL=https://api.osonbiznes.uz/api \
#   OSONBIZNES_SITE_URL=https://osonbiznes.uz \
#   OSONBIZNES_AGENT_KEY=<backend AGENT_API_KEY> bash agent/install.sh   # production
#
# Xavfsizlik: profilga FAQAT `mcp-osonbiznes` toolset beriladi (terminal/fayl/brauzer yo'q).
# Telegram bot token bu skript tomonidan YOZILMAYDI — o'zingiz yangi bot ochib qo'shasiz.
set -euo pipefail

PROFILE="osonbiznes-sales"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERMES_HOME_DIR="${HOME}/.hermes"
PROFILE_DIR="${HERMES_HOME_DIR}/profiles/${PROFILE}"
PY="${HERMES_HOME_DIR}/hermes-agent/venv/bin/python"
API_URL="${OSONBIZNES_API_URL:-http://localhost:5001/api}"
SITE_URL="${OSONBIZNES_SITE_URL:-http://localhost:3055}"
MODEL="${OSONBIZNES_AGENT_MODEL:-gemini-3.6-flash}"

command -v hermes >/dev/null || { echo "hermes topilmadi"; exit 1; }
[ -x "$PY" ] || { echo "Hermes venv python topilmadi: $PY"; exit 1; }

if [ ! -d "$PROFILE_DIR" ]; then
  hermes profile create "$PROFILE" --no-skills --no-alias \
    --description "OsonBiznes CRM uchun Telegram sotuv va yordam agenti (faqat ochiq API toollari)."
fi

cp "$HERE/SOUL.md" "$PROFILE_DIR/SOUL.md"

cat > "$PROFILE_DIR/config.yaml" <<YAML
model:
  default: ${MODEL}
  provider: gemini
agent:
  reasoning_effort: low

# Faqat OsonBiznes toollari. Boshqa hech narsa (terminal, file, browser, web, cronjob...) yo'q.
platform_toolsets:
  cli: [mcp-osonbiznes]
  telegram: [mcp-osonbiznes]

mcp_servers:
  osonbiznes:
    command: ${PY}
    args: ["-I", "${HERE}/osonbiznes_mcp.py"]
    env:
      OSONBIZNES_API_URL: "${API_URL}"
      OSONBIZNES_SITE_URL: "${SITE_URL}"
      OSONBIZNES_AGENT_KEY: "${OSONBIZNES_AGENT_KEY:-}"
    sampling:
      enabled: false

# Telegram'da cwd/home dagi AGENTS.md, CLAUDE.md kabi SHAXSIY fayllar kontekstga tushmasin
# (aks holda mijozga egasining shaxsiy ko'rsatmalari "sizib" ketadi). Profil SOUL.md saqlanadi.
gateway:
  platforms:
    telegram:
      skip_context_files: true

platforms:
  telegram:
    enabled: true
    dm_policy: open        # ommaviy sotuv boti — har kim yoza oladi (toollar cheklangan!)
    group_policy: disabled # guruhlarga qo'shib suiiste'mol qilinmasin
YAML

# .env: mavjud bo'lsa tegmaymiz (u yerda sizning kalitlaringiz)
if [ ! -f "$PROFILE_DIR/.env" ]; then
  umask 077
  cat > "$PROFILE_DIR/.env" <<'ENV'
# @BotFather'dan YANGI bot oching va tokenini shu yerga yozing (boshqa botlaringiz tokenini ishlatmang!)
TELEGRAM_BOT_TOKEN=
# Ommaviy bot uchun majburiy opt-in (dm_policy: open bilan birga)
GATEWAY_ALLOW_ALL_USERS=true
# Gemini API kaliti (aistudio.google.com) — pullik/limitli kalit tavsiya etiladi
GEMINI_API_KEY=
ENV
fi

echo "✅ Profil tayyor: ${PROFILE_DIR}"
echo "   1) ${PROFILE_DIR}/.env ni to'ldiring (TELEGRAM_BOT_TOKEN, GEMINI_API_KEY)"
echo "   2) Sinov:  hermes -p ${PROFILE} chat"
echo "   3) Ishga tushirish:  hermes -p ${PROFILE} gateway start"
