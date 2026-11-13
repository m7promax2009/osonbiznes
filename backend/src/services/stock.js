// Ombor qoldig'ini ATOMIK boshqarish.
// - Mahsulot productId bo'yicha (bo'lmasa aniq nom bo'yicha) topiladi
// - Kamaytirish `stock >= qty` sharti bilan bitta atomik update — parallel sotuvda manfiy qoldiq bo'lmaydi
// - status ('active' | 'low' | 'out') har o'zgarishda qayta hisoblanadi (pre('save') updateOne'da ishlamaydi)
// - Bitta mahsulot yetmasa, oldin kamaytirilganlari qaytariladi (all-or-nothing)

const mongoose = require("mongoose");
const Product = require("../models/Product");
const { escapeRegex } = require("../utils/sanitize");

const STATUS_EXPR = {
  $switch: {
    branches: [
      { case: { $lte: ["$stock", 0] }, then: "out" },
      { case: { $lt: ["$stock", 5] }, then: "low" },
    ],
    default: "active",
  },
};

class StockError extends Error {
  constructor(message) {
    super(message);
    this.name = "StockError";
    this.status = 400;
  }
}

async function findProduct(userId, item) {
  if (item.productId && mongoose.isValidObjectId(item.productId)) {
    const byId = await Product.findOne({
      _id: item.productId,
      userId,
      isActive: { $ne: false },
    });
    if (byId) return byId;
  }
  if (!item.name) return null;
  return Product.findOne({
    userId,
    isActive: { $ne: false },
    name: { $regex: `^${escapeRegex(item.name)}$`, $options: "i" },
  });
}

async function changeStock(productId, delta, requireAvailable) {
  const filter = { _id: productId };
  if (requireAvailable) filter.stock = { $gte: -delta };
  const r = await Product.updateOne(filter, [
    { $set: { stock: { $add: ["$stock", delta] } } },
    { $set: { status: STATUS_EXPR } },
  ]);
  return r.modifiedCount === 1;
}

// Itemlarga productId biriktiradi va qoldiqni kamaytiradi.
// strict=true: katalogda yo'q mahsulot xato (public buyurtmalar). strict=false: erkin qatorlar (xizmat va h.k.) o'tkaziladi.
async function reserveStock(userId, items, { strict = false } = {}) {
  const done = [];
  const resolved = [];
  try {
    for (const item of items) {
      const product = await findProduct(userId, item);
      if (!product) {
        if (strict)
          throw new StockError(
            `Mahsulot topilmadi: ${item.name || item.productId}`,
          );
        resolved.push({ ...item });
        continue;
      }
      const ok = await changeStock(product._id, -item.qty, true);
      if (!ok) {
        const fresh = await Product.findById(product._id)
          .select("stock")
          .lean();
        throw new StockError(
          `"${product.name}" yetarli emas (qoldiq: ${fresh?.stock ?? 0})`,
        );
      }
      done.push({ productId: product._id, qty: item.qty });
      resolved.push({
        ...item,
        productId: product._id,
        name: item.name || product.name,
      });
    }
    return resolved;
  } catch (err) {
    await Promise.all(
      done.map((d) => changeStock(d.productId, d.qty, false).catch(() => {})),
    );
    throw err;
  }
}

// Buyurtma bekor/o'chirilganda qoldiqni qaytarish
async function releaseStock(userId, items) {
  for (const item of items || []) {
    const product = await findProduct(userId, item);
    if (product) await changeStock(product._id, item.qty, false);
  }
}

module.exports = { reserveStock, releaseStock, StockError };
