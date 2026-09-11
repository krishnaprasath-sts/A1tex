import { sequelize } from '../src/database/sequelize.js'

async function fixData() {
  console.log('--- Starting Database Data Repair ---')

  // 1. Repair Category 75 (Silk Sarees)
  await sequelize.query(`
    UPDATE categories
    SET 
      name = 'Silk Sarees',
      slug = 'silk-sarees',
      href = '/shop?section=silk-sarees',
      section = 'Silk',
      nav_visible = 1
    WHERE id = 75
  `)
  console.log('✓ Repaired Category 75 (Silk Sarees)')

  // 2. Repair other parent categories to ensure clean slugs, hrefs, and nav visibility
  await sequelize.query(`
    UPDATE categories
    SET 
      slug = 'cotton-sarees',
      href = '/shop?section=cotton-sarees',
      section = 'Cotton',
      nav_visible = 1
    WHERE id = 76
  `)
  await sequelize.query(`
    UPDATE categories
    SET 
      slug = 'silk-cotton-linen',
      href = '/shop?section=silk-cotton-linen',
      section = 'Silk Cotton',
      nav_visible = 1
    WHERE id = 77
  `)
  await sequelize.query(`
    UPDATE categories
    SET 
      slug = 'browse-all',
      href = '/shop',
      nav_visible = 1
    WHERE id = 79
  `)
  console.log('✓ Verified parent categories 76, 77, 79')

  // 3. Fix all child categories: strip 'collections-' prefix from slug, update href and section
  const [children] = await sequelize.query(`
    SELECT id, parent_id, name, slug, href, section, nav_visible 
    FROM categories 
    WHERE parent_id IS NOT NULL
  `) as [any[], unknown]

  for (const cat of children) {
    let cleanSlug = (cat.slug || '').replace(/^collections-/, '').trim()
    if (!cleanSlug) {
      cleanSlug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }
    const cleanHref = `/shop?category=${cleanSlug}`

    let section = cat.section
    if (cat.parent_id === 75) section = 'Silk'
    else if (cat.parent_id === 76) section = 'Cotton'
    else if (cat.parent_id === 77) section = 'Silk Cotton'
    else if (cat.parent_id === 78) section = 'Celebrity'

    // Enable nav_visible for mega-menu collections under active parents (75, 76, 77)
    const navVisible = [75, 76, 77].includes(cat.parent_id) ? 1 : cat.nav_visible

    await sequelize.query(`
      UPDATE categories
      SET 
        slug = :cleanSlug,
        href = :cleanHref,
        section = :section,
        nav_visible = :navVisible
      WHERE id = :id
    `, {
      replacements: { cleanSlug, cleanHref, section, navVisible, id: cat.id }
    })
  }
  console.log(`✓ Cleaned ${children.length} child categories (slugs, hrefs, sections, navVisible)`)

  // 4. Update products: for any product where category_id points to a child category, sync sub_category_id
  await sequelize.query(`
    UPDATE products p
    JOIN categories c ON p.category_id = c.id
    SET p.sub_category_id = p.category_id
    WHERE c.parent_id IS NOT NULL AND p.sub_category_id IS NULL
  `)
  console.log('✓ Synced products sub_category_id from child category_id')

  // Print summary of parent and child categories
  const [allCats] = await sequelize.query(`
    SELECT id, parent_id, name, slug, href, section, nav_visible 
    FROM categories 
    WHERE deleted_at IS NULL
    ORDER BY parent_id ASC, id ASC
  `)
  console.log('\n--- Current Category State ---')
  console.table(allCats)

  console.log('\n--- Database Repair Completed Successfully ---')
  process.exit(0)
}

fixData().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
