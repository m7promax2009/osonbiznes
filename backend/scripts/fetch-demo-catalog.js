// Bir martalik: demo katalog (DummyJSON — test uchun ochiq ma'lumot) rasmlarini lokal saqlaydi.
// Natija: backend/demo-assets/<kategoriya>/<slug>-<n>.webp + catalog.json
// Faqat dev/demo seed uchun. Production'da do'kon egalari o'z rasmlarini yuklaydi.
//   node scripts/fetch-demo-catalog.js
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'demo-assets')
const CATS = {
  smartphones: 'Smartfonlar',
  laptops: 'Noutbuklar',
  tablets: 'Planshetlar',
  'mobile-accessories': 'Aksessuarlar',
  'mens-watches': 'Soatlar',
  'womens-watches': 'Soatlar',
  fragrances: 'Parfyumeriya',
  'mens-shoes': 'Poyabzal',
  'womens-bags': 'Sumkalar',
  sunglasses: "Ko'zoynaklar",
}

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

async function download(url, file) {
  if (fs.existsSync(file)) return
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()))
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const catalog = []
  for (const [slug, uz] of Object.entries(CATS)) {
    const r = await fetch(`https://dummyjson.com/products/category/${slug}?limit=12&select=title,brand,price,images,thumbnail`)
    const { products } = await r.json()
    const dir = path.join(OUT, slug)
    fs.mkdirSync(dir, { recursive: true })
    for (const p of products) {
      const base = slugify(p.title)
      const imgs = []
      for (const [i, url] of (p.images || []).slice(0, 3).entries()) {
        const ext = path.extname(new URL(url).pathname) || '.webp'
        const name = `${base}-${i + 1}${ext}`
        try {
          await download(url, path.join(dir, name))
          imgs.push(`/uploads/demo/${slug}/${name}`)
        } catch (e) {
          console.warn('skip', url, e.message)
        }
      }
      if (imgs.length) catalog.push({ name: p.title, brand: p.brand || '', category: uz, usd: p.price, images: imgs, source: slug })
    }
    console.log(`${slug}: ${products.length}`)
  }
  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 1))
  console.log('jami:', catalog.length)
})()
