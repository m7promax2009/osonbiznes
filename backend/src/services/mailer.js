// Email yuborish: SMTP env bo'lsa — haqiqiy xat; dev'da SMTP yo'q bo'lsa — kod server konsoliga yoziladi.
// Production'da SMTP yo'q bo'lsa xato qaytaradi ("kod yuborildi" deb aldamaymiz).
const nodemailer = require('nodemailer')

let transporter = null
function getTransport() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: (Number(SMTP_PORT) || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return transporter
}

class MailNotConfiguredError extends Error {}

async function sendMail({ to, subject, text }) {
  const t = getTransport()
  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      throw new MailNotConfiguredError('SMTP sozlanmagan')
    }
    console.log(`\n📧 [DEV EMAIL] to=${to}\n   ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`)
    return
  }
  await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text })
}

module.exports = { sendMail, MailNotConfiguredError }
