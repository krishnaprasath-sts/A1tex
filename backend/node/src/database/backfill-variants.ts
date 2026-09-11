import { Op } from 'sequelize'
import { sequelize } from './sequelize.js'
import { Product, ProductVariant } from '../models/index.js'

async function backfillVariants() {
  await sequelize.authenticate()

  const products = await Product.findAll({
    where: { deletedAt: null },
    include: [{ model: ProductVariant, as: 'variants', required: false }],
  })

  let created = 0
  let skipped = 0

  for (const product of products) {
    const p = product as any
    const variants = p.get('variants') as any[]
    if (variants && variants.length > 0) {
      skipped++
      continue
    }

    const productId = p.get('id') as number
    const stockQty = Number(p.get('stockQty') ?? 0)
    const price = Number(p.get('price') ?? 0)

    await ProductVariant.create({
      productId,
      variantType: 'color',
      label: 'Default',
      price,
      stockQty,
      isDefault: true,
      status: 'active',
      sortOrder: 0,
    })

    await Product.update({ hasVariants: true }, { where: { id: productId } })

    console.log(`  ✓ Created variant for product #${productId}: "${p.get('name')}" (stock: ${stockQty})`)
    created++
  }

  console.log(`\nDone. ${created} variant(s) created, ${skipped} product(s) already had variants.`)
  await sequelize.close()
}

backfillVariants().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
