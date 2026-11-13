// OsonBozor / Telegram'da OCHIQ ko'rinadigan do'konlar — yagona qoida:
// egasi "OsonBozorda ko'rsatish"ni yoqqan + akkaunt faol + trial/obuna muddati o'tmagan.
const ShopProfile = require('../models/ShopProfile')
const User = require('../models/User')

async function getPublicShopIds() {
  const profiles = await ShopProfile.find({ showOnMarketplace: true }).select('userId').lean()
  const users = await User.find({
    _id: { $in: profiles.map(p => p.userId) },
    role: 'shop_owner',
    isActive: true,
    tariff: { $in: ['trial', 'start', 'pro', 'business'] },
    emailVerified: { $ne: false }, // email tasdiqlanmagan do'kon ommaga chiqmaydi
  }).select('_id tariff trialEndsAt subscriptionEnd')
  // tariffStatus — virtual: muddati o'tganlar chiqarib tashlanadi
  return users.filter(u => ['trial_active', 'active'].includes(u.tariffStatus)).map(u => u._id)
}

module.exports = { getPublicShopIds }
