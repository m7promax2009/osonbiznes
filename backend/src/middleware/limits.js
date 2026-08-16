const Product = require('../models/Product')
const Customer = require('../models/Customer')
const { getLimit } = require('../config/planLimits')

const MODELS = { products: Product, customers: Customer }

// Tarif resurs chekloviga yetganini tekshiruvchi middleware (POST'dan oldin qo'yiladi).
// authenticate'dan KEYIN ishlatilishi shart (req.user kerak).
function enforceLimit(resource) {
  return async (req, res, next) => {
    try {
      const Model = MODELS[resource]
      if (!Model) return next()
      const limit = getLimit(req.user.tariff, resource)
      if (limit === Infinity) return next()
      const count = await Model.countDocuments({ userId: req.user.id, isActive: true })
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          message: `Tarif chekloviga yetdingiz (${limit} ta). Ko'proq qo'shish uchun tarifni yangilang.`,
          limitReached: true,
          limit,
          current: count,
          resource,
        })
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { enforceLimit }
