// Parol siyosati — server tomonda yagona tekshiruv (register, reset, parol almashtirish, admin yaratish).
// Login'da tekshirilmaydi: eski akkauntlar kirib, keyin parolini yangilay olsin.

const COMMON = new Set(
  `123456 1234567 12345678 123456789 1234567890 12345 1234 111111 000000 112233 121212 123123 654321 666666 777777 888888 999999
  password passw0rd password1 password123 qwerty qwerty123 qwertyuiop asdfgh asdfghjkl zxcvbnm 1q2w3e 1q2w3e4r 1q2w3e4r5t qazwsx
  abc123 abcd1234 admin admin123 admin1234 root toor letmein welcome welcome1 iloveyou monkey dragon sunshine football baseball
  master superman batman shadow michael freedom whatever trustno1 starwars login princess solo hello hello123 test test123
  parol parol123 salom salom123 uzbekistan toshkent tashkent osonbiznes osonbiznes123 dokon dokon123 biznes biznes123
  qwe123 qweasd qweasdzxc 1qaz2wsx zaq12wsx 147258 159753 123qwe 123abc a123456 aa123456 1234qwer qwer1234`.split(/\s+/).filter(Boolean)
)

const MIN_LEN = 8

function isSequential(s) {
  const seqs = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
  const low = s.toLowerCase()
  return seqs.some(seq => seq.includes(low) || seq.split('').reverse().join('').includes(low))
}

// Xato matnini qaytaradi, yaxshi bo'lsa null
function checkPassword(password, { email = '', name = '', phone = '' } = {}) {
  if (typeof password !== 'string' || !password) return 'Parolni kiriting'
  if (password.length < MIN_LEN) return `Parol kamida ${MIN_LEN} belgidan iborat bo'lsin`
  if (password.length > 128) return 'Parol juda uzun (128 belgigacha)'
  const low = password.toLowerCase()
  if (COMMON.has(low) || COMMON.has(low.replace(/[!@#.$_-]+$/, ''))) {
    return "Bu parol juda keng tarqalgan — uni buzish oson. Boshqasini tanlang"
  }
  if (/^(.)\1+$/.test(password)) return "Bir xil belgilardan iborat parol bo'lmaydi"
  if (isSequential(password)) return "Ketma-ket belgilar (12345678, abcdefgh) parol bo'la olmaydi"
  if (!/[a-zA-Zа-яА-Я]/.test(password) || !/\d/.test(password)) {
    return "Parolda kamida bitta harf va bitta raqam bo'lsin"
  }
  const local = String(email).split('@')[0].toLowerCase()
  if (local.length >= 4 && low.includes(local)) return "Parolda emailingizni ishlatmang"
  const firstName = String(name).trim().split(/\s+/)[0]?.toLowerCase() || ''
  if (firstName.length >= 4 && low.includes(firstName)) return 'Parolda ismingizni ishlatmang'
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length >= 7 && password.replace(/\D/g, '').includes(digits.slice(-7))) {
    return 'Parolda telefon raqamingizni ishlatmang'
  }
  return null
}

module.exports = { checkPassword, MIN_LEN }
