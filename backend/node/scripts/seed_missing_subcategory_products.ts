import { sequelize } from '../src/database/sequelize.js'
import { Category, Product, ProductVariant, ProductImage } from '../src/models/index.js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

const SUBCATEGORY_PRODUCT_TEMPLATES: Record<string, {
  name: string
  fabric: string
  occasion: string
  zariType: string
  blouseIncluded: string
  color: string
  colorHex: string
  price: number
  originalPrice: number
  description: string
  images: string[]
  type?: string
}> = {
  // Silk Sarees (parent 75)
  'Semi Tissue Silk Saree': {
    name: 'Exquisite Semi Tissue Silk Saree in Champagne Gold & Coral Border',
    fabric: 'Semi Tissue Silk',
    occasion: 'Weddings & Festive Receptions',
    zariType: 'Shimmering Metallic Gold Zari',
    blouseIncluded: 'Contrast Brocade Blouse Piece (0.8m)',
    color: 'Champagne Gold / Coral',
    colorHex: '#d4af37',
    price: 999,
    originalPrice: 1899,
    description: 'A luminous Semi Tissue Silk saree with a subtle metallic golden sheen and hand-embossed floral creepers on the border. Lightweight, fluid drape designed for grand celebrations.',
    images: ['/saree1.png', '/saree3.png', '/heritage_silk.png']
  },
  'Kanchi Semisilk Saree': {
    name: 'Royal Kanchi Semisilk Saree with Traditional Mayil Buttas',
    fabric: 'Kanchi Semisilk',
    occasion: 'Ceremonial & Bridal Guest',
    zariType: 'Traditional Pure Gold Tone Zari',
    blouseIncluded: 'Unstitched Contrast Running Blouse (0.8m)',
    color: 'Teal Blue / Magenta',
    colorHex: '#0d9488',
    price: 1049,
    originalPrice: 1999,
    description: 'Imbued with classic Kanchipuram charm, this semi-silk masterpiece features rich peacock (mayil) motifs along the korvai border and a majestic ceremonial pallu.',
    images: ['/heritage_silk.png', '/saree2.png', '/hero-saree.png']
  },
  'Soft Silk': {
    name: 'Artisanal Soft Silk Saree in Sunset Orange & Maroon Zari Border',
    fabric: 'Soft Silk',
    occasion: 'Festivals & Temple Visits',
    zariType: 'Antique Copper Zari',
    blouseIncluded: 'Running Jacquard Blouse (0.8m)',
    color: 'Sunset Orange / Maroon',
    colorHex: '#ea580c',
    price: 899,
    originalPrice: 1699,
    description: 'Woven from premium soft silk yarns for effortless draping and unmatched comfort throughout festive rituals. Adorned with delicate floral jaal zari patterns.',
    images: ['/saree3.png', '/saree1.png', '/new_arrival_1.png']
  },
  '3D Emboss Saree': {
    name: 'Modern 3D Emboss Jacquard Silk Saree in Royal Crimson',
    fabric: 'Embossed Soft Silk',
    occasion: 'Party & Festive Gatherings',
    zariType: 'Dual-Tone Emboss Metallic Zari',
    blouseIncluded: 'Embossed Matching Blouse Piece (0.8m)',
    color: 'Crimson Red',
    colorHex: '#b91c1c',
    price: 949,
    originalPrice: 1799,
    description: 'Innovative 3D embossed weaving technique creates raised textural motifs that catch the light beautifully. Finished with a contemporary self-design pallu.',
    images: ['/saree4.png', '/saree6.png', '/new_arrival_2.png']
  },
  'Tappeta Soft Silk': {
    name: 'Graceful Tappeta Soft Silk Saree with Paisley Pallu',
    fabric: 'Tappeta Silk',
    occasion: 'Family Functions & Celebrations',
    zariType: 'Subtle Gold Zari Weave',
    blouseIncluded: 'Plain Contrast Blouse Piece (0.8m)',
    color: 'Emerald Green / Gold',
    colorHex: '#047857',
    price: 849,
    originalPrice: 1599,
    description: 'Features a smooth, crisp taffeta texture with rich body and high tensile drape. Embellished with classic mango (paisley) and floral vine borders.',
    images: ['/saree5.png', '/saree2.png', '/new_arrival_3.png']
  },
  'Nylon Soft Silk Saree': {
    name: 'Lustrous Nylon Soft Silk Saree with Geometric Temple Border',
    fabric: 'Nylon Soft Silk Blend',
    occasion: 'Casual Festive & Parties',
    zariType: 'Glimmering Silver-Gold Zari',
    blouseIncluded: 'Contrast Matching Blouse Piece (0.8m)',
    color: 'Plum Purple',
    colorHex: '#581c87',
    price: 799,
    originalPrice: 1499,
    description: 'Resilient and crease-free soft silk blend offering a glossy finish, vibrant color retention, and effortless drape for long festive hours.',
    images: ['/saree6.png', '/saree1.png', '/lookbook_detail.png']
  },
  'Dola Silk': {
    name: 'Designer Dola Silk Saree with Meenakari Floral Weave',
    fabric: 'Pure Dola Silk',
    occasion: 'Weddings & High Occasions',
    zariType: 'Intricate Meenakari & Gold Zari',
    blouseIncluded: 'Heavy Embroidered Blouse (0.8m)',
    color: 'Mustard Yellow / Rani Pink',
    colorHex: '#ca8a04',
    price: 1199,
    originalPrice: 2299,
    description: 'Famous for its buttery soft handfeel and luxurious sheen, this Dola Silk saree showcases multi-colored meenakari floral work along the grand pallu.',
    images: ['/saree1.png', '/heritage_silk.png', '/hero-card1.png']
  },
  'Mysore Silk Saree': {
    name: 'Heritage Mysore Silk Saree with Pure Zari Kasuti Border',
    fabric: 'Mysore Silk',
    occasion: 'Traditional Ceremonies & Poojas',
    zariType: 'Classic Gold Zari Border',
    blouseIncluded: 'Attached Matching Blouse Piece (0.8m)',
    color: 'Royal Sapphire Blue',
    colorHex: '#1d4ed8',
    price: 1149,
    originalPrice: 2199,
    description: 'Celebrated for its distinct softness, natural sheen, and rich heritage drape. Detailed with fine Kasuti-inspired border motifs and a stately zari pallu.',
    images: ['/saree2.png', '/saree4.png', '/lookbook_main.png']
  },
  'Tussar Silk Saree': {
    name: 'Organic Tussar Silk Saree with Handpainted Madhubani Motifs',
    fabric: 'Handwoven Tussar Silk',
    occasion: 'Cultural Events & Elegant Soirées',
    zariType: 'Antique Matte Gold Zari',
    blouseIncluded: 'Raw Silk Contrast Blouse (0.8m)',
    color: 'Natural Beige / Rust Red',
    colorHex: '#b45309',
    price: 1299,
    originalPrice: 2499,
    description: 'Earthy, rich texture woven from wild silkworm fibers. Hand-detailed with traditional motifs and finished with delicate zari piping along the edges.',
    images: ['/saree3.png', '/saree5.png', '/hero-card2.png']
  },
  'Katan Soft Silk Saree': {
    name: 'Opulent Katan Soft Silk Saree in Bottle Green & Antique Brocade',
    fabric: 'Katan Silk',
    occasion: 'Grand Weddings & Receptions',
    zariType: 'Heavy Antique Brocade Zari',
    blouseIncluded: 'Jacquard Brocade Blouse (0.8m)',
    color: 'Bottle Green / Antique Gold',
    colorHex: '#14532d',
    price: 1249,
    originalPrice: 2399,
    description: 'Pure filament silk threads twisted together to create a durable, structured weave. Adorned with dense brocade jaal work that exudes aristocratic grace.',
    images: ['/saree4.png', '/saree1.png', '/heritage_silk.png']
  },
  'Kolam Soft Silk': {
    name: 'Sacred Kolam Soft Silk Saree with Temple Rangoli Motifs',
    fabric: 'Soft Silk',
    occasion: 'Festivals, Marriages & Poojas',
    zariType: 'Fine Traditional Gold Zari',
    blouseIncluded: 'Running Contrast Blouse Piece (0.8m)',
    color: 'Maroon & Turmeric Yellow',
    colorHex: '#831843',
    price: 929,
    originalPrice: 1749,
    description: 'Features intricately woven Kolam (sacred geometric floor art) motifs along the body and pallu, symbolizing auspicious beginnings and prosperity.',
    images: ['/saree5.png', '/saree6.png', '/new_arrival_4.png']
  },

  // Cotton Sarees (parent 76)
  'Khadi Cotton': {
    name: 'Handspun Pure Khadi Cotton Saree with Earthy Stripes & Tassels',
    fabric: '100% Handspun Khadi Cotton',
    occasion: 'Daily Workwear & Summer Festive',
    zariType: 'Minimal Woven Thread Border',
    blouseIncluded: 'Running Khadi Blouse (0.8m)',
    color: 'Indigo Blue & Off-White',
    colorHex: '#312e81',
    price: 649,
    originalPrice: 1199,
    description: 'Breathable, skin-friendly handspun cotton that grows softer with every wash. Designed with hand-tied pallu tassels and understated artisanal borders.',
    images: ['/saree2.png', '/saree4.png', '/new_arrival_2.png']
  },
  'Kerala Cotton': {
    name: 'Authentic Kerala Cotton Saree with Traditional Kasavu Border',
    fabric: 'Fine Kerala Cotton',
    occasion: 'Temple Poojas & Onam Celebrations',
    zariType: 'Golden Kasavu Zari Border',
    blouseIncluded: 'Unstitched Kasavu Border Blouse (0.8m)',
    color: 'Off-White / Golden Kasavu',
    colorHex: '#fef08a',
    price: 699,
    originalPrice: 1299,
    description: 'The epitome of South Indian elegance. Woven from pristine unbleached cotton yarns featuring rich gold kasavu zari borders and temple lines.',
    images: ['/saree1.png', '/saree5.png', '/hero-card1.png']
  },
  'Aarani Checked Cotton': {
    name: 'Heritage Aarani Checked Handloom Cotton Saree',
    fabric: 'Aarani Handloom Cotton',
    occasion: 'Traditional Gatherings & Summer Wear',
    zariType: 'Woven Contrast Thread Border',
    blouseIncluded: 'Matching Check Blouse (0.8m)',
    color: 'Crimson & Olive Checks',
    colorHex: '#991b1b',
    price: 699,
    originalPrice: 1349,
    description: 'Woven by master weavers in the historic Aarani cluster. Bold checks across the body paired with traditional korvai solid border detailing.',
    images: ['/saree3.png', '/saree6.png', '/new_arrival_3.png']
  },
  'Kalyani Checked Cotton': {
    name: 'Classic Kalyani Checked Soft Cotton Saree with Temple Border',
    fabric: 'Pure Kalyani Cotton',
    occasion: 'Festivals & Daily Elegance',
    zariType: 'Temple Motif Woven Border',
    blouseIncluded: 'Contrast Solid Blouse (0.8m)',
    color: 'Forest Green / Mustard',
    colorHex: '#166534',
    price: 679,
    originalPrice: 1299,
    description: 'Finely spun Kalyani cotton known for its feather-light feel and cooling drape. Accented by geometric temple borders and micro-checks body.',
    images: ['/saree4.png', '/saree2.png', '/lookbook_detail.png']
  },
  'Poly Cotton Saree': {
    name: 'Easy-Care Printed Poly Cotton Saree with Floral Vines',
    fabric: 'Poly Cotton Blend',
    occasion: 'Office Wear & Everyday Comfort',
    zariType: 'Subtle Woven Thread Border',
    blouseIncluded: 'Running Print Blouse (0.8m)',
    color: 'Lavender / Violet',
    colorHex: '#7c3aed',
    price: 549,
    originalPrice: 999,
    description: 'Wrinkle-resistant and incredibly easy to maintain. Beautiful pastel floral prints on a durable poly-cotton blend that holds its pleats all day long.',
    images: ['/saree5.png', '/saree1.png', '/hero-card2.png']
  },
  'Mulmul Cotton': {
    name: 'Featherlight Mulmul Cotton Saree with Bagru Block Prints',
    fabric: '100% Superfine Mulmul Cotton',
    occasion: 'Casual Outings & Hot Summer Days',
    zariType: 'Hand Block Print Finished Border',
    blouseIncluded: 'Coordinated Block Printed Blouse (0.8m)',
    color: 'Peach & Charcoal Grey',
    colorHex: '#f43f5e',
    price: 749,
    originalPrice: 1399,
    description: 'Known as the lightest cotton weave in the subcontinent. Hand-block printed using natural dyes with botanical motifs that embody effortless grace.',
    images: ['/saree6.png', '/saree3.png', '/new_arrival_1.png']
  },
  'Narayanpet Cotton Saree': {
    name: 'Authentic Narayanpet Handloom Cotton Saree with Ganga Jamuna Border',
    fabric: 'Narayanpet Pure Cotton',
    occasion: 'Traditional Events & Festive Gatherings',
    zariType: 'Pure Zari Temple Border',
    blouseIncluded: 'Contrast Running Blouse (0.8m)',
    color: 'Deep Teal / Ruby Red',
    colorHex: '#0f766e',
    price: 799,
    originalPrice: 1499,
    description: 'Characterized by its rich double-colored Ganga Jamuna borders and traditional geometric pallu stripes, woven with unmatched handloom precision.',
    images: ['/saree1.png', '/saree4.png', '/heritage_silk.png']
  },
  'Sungudi Sarees': {
    name: 'Traditional Madurai Sungudi Saree with Authentic Tie-Dye Dots',
    fabric: 'Madurai Pure Cotton',
    occasion: 'Cultural Festivals & Casual Gatherings',
    zariType: 'Zari Border with Sungudi Motifs',
    blouseIncluded: 'Running Cotton Blouse (0.8m)',
    color: 'Rani Pink & Sunshine Yellow',
    colorHex: '#db2777',
    price: 699,
    originalPrice: 1299,
    description: 'Handcrafted in Madurai through authentic knotting and dip-dyeing techniques. Featuring fine circular dot patterns and shimmering zari pettu borders.',
    images: ['/saree2.png', '/saree5.png', '/menu_saree_editorial.png']
  },
  'Sungudi Cotton Saree': {
    name: 'Madurai Sungudi Pure Cotton Saree with Peacock Zari Border',
    fabric: '100% Combed Cotton',
    occasion: 'Daily Temple Wear & Celebrations',
    zariType: 'Peacock Motif Gold Zari',
    blouseIncluded: 'Matching Dot Printed Blouse (0.8m)',
    color: 'Royal Blue & Red',
    colorHex: '#1e40af',
    price: 729,
    originalPrice: 1349,
    description: 'Pure combed cotton Sungudi with all-over ring pattern and contrasting borders woven with dancing peacock buttas.',
    images: ['/saree3.png', '/saree1.png', '/hero-saree.png']
  },
  'Kanchi Cotton Saree': {
    name: 'Handwoven Kanchi Cotton Saree with Traditional Rettai Pettu Border',
    fabric: 'Kanchipuram Handloom Cotton',
    occasion: 'Festivals & Traditional Functions',
    zariType: 'Traditional Thread & Zari Border',
    blouseIncluded: 'Unstitched Plain Blouse (0.8m)',
    color: 'Brick Red & Mustard',
    colorHex: '#9a3412',
    price: 849,
    originalPrice: 1599,
    description: 'Woven with high-count cotton yarns on traditional pit looms in Kanchipuram. Displays double-pet border weave and rich horizontal pallu bands.',
    images: ['/saree4.png', '/saree6.png', '/new_arrival_4.png']
  },
  'South Cotton Saree': {
    name: 'Handloom South Cotton Saree with Woven Thread Buttas',
    fabric: 'South Indian Pure Cotton',
    occasion: 'Daily Work & Family Get-Togethers',
    zariType: 'Fine Thread Woven Border',
    blouseIncluded: 'Attached Contrast Blouse (0.8m)',
    color: 'Turquoise Blue / Coral',
    colorHex: '#0284c7',
    price: 649,
    originalPrice: 1199,
    description: 'Crisp yet soft South Indian handloom cotton with micro floral buttas dotted across the body. Airy and graceful for all seasons.',
    images: ['/saree5.png', '/saree2.png', '/lookbook_main.png']
  },
  'Handloom Cotton Korvai Cotton': {
    name: 'Masterpiece Handloom Korvai Cotton Saree with Contrast Temple Border',
    fabric: 'High Count Handloom Cotton',
    occasion: 'Weddings & Auspicious Rituals',
    zariType: 'Korvai Interlocked Zari Weave',
    blouseIncluded: 'Contrast Korvai Blouse (0.8m)',
    color: 'Burgundy Wine & Deep Green',
    colorHex: '#701a75',
    price: 899,
    originalPrice: 1699,
    description: 'Features the arduous Korvai interlocking technique where the body and border are woven separately and joined seamlessly on handlooms.',
    images: ['/saree6.png', '/saree3.png', '/hero-card1.png']
  },
  'Kerala Saree': {
    name: 'Traditional Kerala Kasavu Handloom Saree with Floral Pallu',
    fabric: 'Pure Kerala Cotton',
    occasion: 'Vishu, Onam & Temple Celebrations',
    zariType: 'Fine Golden Kasavu Zari',
    blouseIncluded: 'Kasavu Border Blouse Piece (0.8m)',
    color: 'Natural Cream / Gold',
    colorHex: '#fef9c3',
    price: 699,
    originalPrice: 1299,
    description: 'Celebrated cultural attire of Kerala. Pristine cream handloom body framed by rich golden kasavu borders with floral leaf motifs on the pallu.',
    images: ['/saree1.png', '/saree5.png', '/new_arrival_2.png']
  },
  'Kerala Tissue': {
    name: 'Luminous Kerala Kasavu Tissue Festive Saree with Golden Sheen',
    fabric: 'Tissue Cotton Blend',
    occasion: 'Festive Receptions & Onam Parties',
    zariType: 'All-Over Golden Tissue Warp',
    blouseIncluded: 'Tissue Brocade Blouse (0.8m)',
    color: 'Rich Gold / Cream',
    colorHex: '#eab308',
    price: 849,
    originalPrice: 1599,
    description: 'Glistening gold tissue weave blended with soft cotton for ceremonial grandeur. Captures festival radiance under daylight and stage lamps alike.',
    images: ['/saree2.png', '/saree4.png', '/hero-saree.png']
  },

  // Silk Cotton & Linen (parent 77)
  'Silk Cotton Saree': {
    name: 'Dual-Tone Silk Cotton Saree with Floral Jacquard Weave',
    fabric: 'Pure Silk Cotton (Sico)',
    occasion: 'Festivals, Weddings & Receptions',
    zariType: 'Gleaming Gold Zari Border',
    blouseIncluded: 'Contrast Silk Cotton Blouse (0.8m)',
    color: 'Peacock Blue & Magenta',
    colorHex: '#0369a1',
    price: 899,
    originalPrice: 1699,
    description: 'Blends the lustrous glow of pure silk warp with the airy breathability of fine cotton weft. Completed with intricate floral vine zari borders.',
    images: ['/saree3.png', '/saree1.png', '/heritage_silk.png']
  },
  'Plain Silk Cotton': {
    name: 'Minimalist Plain Silk Cotton Saree with Heavy Contrast Pallu',
    fabric: 'Plain Weave Silk Cotton',
    occasion: 'Formal Gatherings & Evening Wear',
    zariType: 'Fine Zari Ribbon Border',
    blouseIncluded: 'Contrast Plain Blouse Piece (0.8m)',
    color: 'Jet Black / Royal Red',
    colorHex: '#18181b',
    price: 799,
    originalPrice: 1499,
    description: 'Sleek, understated plain body contrasting against a richly textured zari pallu. Perfect for women who adore modern minimalism with traditional touch.',
    images: ['/saree4.png', '/saree5.png', '/lookbook_detail.png']
  },
  'Linen Cotton': {
    name: 'Contemporary Linen Cotton Saree with Geometric Block Motifs',
    fabric: 'Linen Cotton Blend',
    occasion: 'Art Events, Workwear & Brunches',
    zariType: 'Silver Zari Pinstripe Border',
    blouseIncluded: 'Coordinated Linen Blouse (0.8m)',
    color: 'Sage Green & Beige',
    colorHex: '#4d7c0f',
    price: 849,
    originalPrice: 1599,
    description: 'Rich flax linen fibers combined with organic cotton provide a sophisticated textured drape. Styled with hand-twisted tassels along the pallu.',
    images: ['/saree5.png', '/saree6.png', '/new_arrival_3.png']
  },
  'Exclusive Silk Cotton': {
    name: 'Exclusive Designer Silk Cotton Saree with Antique Brocade',
    fabric: 'Premium Mercerized Silk Cotton',
    occasion: 'Weddings & Grand Milestones',
    zariType: 'Heavy Antique Gold Brocade',
    blouseIncluded: 'Jacquard Brocade Blouse Piece (0.8m)',
    color: 'Royal Purple & Copper Zari',
    colorHex: '#6b21a8',
    price: 999,
    originalPrice: 1899,
    description: 'Limited edition weave combining high-lustre silk with mercerized cotton yarns for maximum durability, vibrant colorfastness, and royal appearance.',
    images: ['/saree6.png', '/saree2.png', '/hero-card1.png']
  },
  'Digital Linen Cotton': {
    name: 'Modern Digital Print Linen Cotton Saree in Watercolor Flora',
    fabric: 'Soft Linen Cotton',
    occasion: 'Summer Soirées & Cocktail Brunches',
    zariType: 'Fine Golden Thread Border',
    blouseIncluded: 'Printed Digital Blouse (0.8m)',
    color: 'Pastel Aqua & Coral',
    colorHex: '#06b6d4',
    price: 899,
    originalPrice: 1649,
    description: 'Features high-definition digital prints of blooming watercolor flora across a breezy linen-cotton canvas. Modern couture meets artisanal comfort.',
    images: ['/saree1.png', '/saree3.png', '/menu_saree_editorial.png']
  },
  'Khadi Embroidery': {
    name: 'Handcrafted Khadi Cotton Saree with Intricate Aari Embroidery',
    fabric: 'Handloom Khadi Cotton',
    occasion: 'Festivals, Exhibitions & Functions',
    zariType: 'Hand-Embroidered Zari Borders',
    blouseIncluded: 'Embroidered Khadi Blouse (0.8m)',
    color: 'Rust Orange / Cream',
    colorHex: '#c2410c',
    price: 949,
    originalPrice: 1799,
    description: 'Each piece features hours of painstaking hand-embroidery by skilled artisans. Raised thread and zari embroidery along the borders and pallu.',
    images: ['/saree2.png', '/saree4.png', '/lookbook_main.png']
  },

  // Celebrity & Festive (parent 78)
  'Nita Ambani Celebrity Inspired': {
    name: 'Nita Ambani Inspired Royal Heritage Saree in Emerald & Real Zari Look',
    fabric: 'Grand Tissue Silk Brocade',
    occasion: 'Red Carpet, High Society Weddings & Galas',
    zariType: 'Opulent Antique Gold & Cutwork Zari',
    blouseIncluded: 'Heavy Embroidered Designer Blouse (0.8m)',
    color: 'Emerald Green & Royal Gold',
    colorHex: '#065f46',
    price: 1499,
    originalPrice: 2999,
    description: 'Inspired by the iconic heirloom ensembles worn by Nita Ambani. Exquisitely woven with intricate floral jaal, scalloped zari borders, and regal poise.',
    images: ['/hero-saree.png', '/heritage_silk.png', '/saree1.png']
  },
  'Nits Ambani Saree': {
    name: 'Celebrity Icon Silk Saree in Regal Crimson with Shimmering Zari Work',
    fabric: 'Pure Silk Tissue Blend',
    occasion: 'Grand Celebrations & Wedding Receptions',
    zariType: 'Intricate Floral Gold Zari',
    blouseIncluded: 'Designer Embellished Blouse Piece (0.8m)',
    color: 'Regal Crimson & Gold',
    colorHex: '#991b1b',
    price: 1399,
    originalPrice: 2799,
    description: 'An ode to timeless high-fashion sarees with intricate gold zari brocade, ornate borders, and a flowing drape suited for the spotlight.',
    images: ['/hero-card1.png', '/saree3.png', '/menu_saree_editorial.png']
  },
  'Pallaku Saree': {
    name: 'Heritage Pallaku Motif Bridal Silk Saree in Vermilion Red',
    fabric: 'Kanchi Soft Silk',
    occasion: 'Bridal Muhurtham & Ceremonial Occasions',
    zariType: 'Traditional Golden Zari Pallaku Motifs',
    blouseIncluded: 'Heavy Brocade Blouse Piece (0.8m)',
    color: 'Vermilion Red & Gold',
    colorHex: '#b91c1c',
    price: 1299,
    originalPrice: 2599,
    description: 'Features the revered Pallaku (royal palanquin) motif woven into the border and pallu, symbolizing auspicious bridal journeys and marital prosperity.',
    images: ['/heritage_silk.png', '/saree4.png', '/new_arrival_1.png']
  },
  'Vaira Oosi Saree': {
    name: 'Iconic Vaira Oosi Diamond Needlework Zari Silk Saree',
    fabric: 'Pure Kanchipuram Soft Silk',
    occasion: 'Bridal Trousseau & Family Milestones',
    zariType: 'Authentic Vaira Oosi Fine Zari Stripes',
    blouseIncluded: 'Contrast Zari Border Blouse (0.8m)',
    color: 'Royal Magenta & Gold',
    colorHex: '#86198f',
    price: 1349,
    originalPrice: 2699,
    description: 'Named after the needle-fine diamond pinstripes (Vaira Oosi) woven into the body using pure gold zari. A masterwork of South Indian handloom tradition.',
    images: ['/saree5.png', '/saree1.png', '/lookbook_main.png']
  },
  'Raga Bordered Tissue': {
    name: 'Graceful Raga Bordered Metallic Tissue Silk Festive Saree',
    fabric: 'Metallic Tissue Silk',
    occasion: 'Sangeet, Receptions & Festive Evenings',
    zariType: 'Dual-Tone Metallic Gold & Silver Zari',
    blouseIncluded: 'Tissue Jacquard Blouse (0.8m)',
    color: 'Rose Gold / Champagne',
    colorHex: '#fb7185',
    price: 1199,
    originalPrice: 2299,
    description: 'Woven with subtle musical instrument (Veena & Raga) flourishes along the temple border, with an all-over luminous rose gold metallic sheen.',
    images: ['/saree6.png', '/saree2.png', '/hero-card2.png']
  },
  '1000 Butta Sarees': {
    name: 'Aayiram Butta (1000 Butta) Handloom Heritage Saree',
    fabric: 'Traditional Handloom Silk Cotton',
    occasion: 'Temple Poojas & Auspicious Festivals',
    zariType: 'Annapakshi, Mayil & Rudraksha Buttas',
    blouseIncluded: 'Traditional Contrast Blouse (0.8m)',
    color: 'Mustard Yellow & Maroon',
    colorHex: '#854d0e',
    price: 1099,
    originalPrice: 2199,
    description: 'Legendary "Aayiram Butta" design featuring thousands of miniature handwoven motifs (swan, peacock, rudraksha) rhythmically aligned across the entire body.',
    images: ['/saree1.png', '/saree4.png', '/new_arrival_2.png']
  },
  'Onam Saree': {
    name: 'Festive Kasavu Onam Saree with Hand-Woven Mural Art Pallu',
    fabric: 'Fine Cotton Tissue Kasavu',
    occasion: 'Onam Festival, Vishu & Traditional Gatherings',
    zariType: 'Golden Kasavu Zari Border',
    blouseIncluded: 'Kasavu Tissue Blouse Piece (0.8m)',
    color: 'Off-White / Golden Kasavu',
    colorHex: '#fef08a',
    price: 849,
    originalPrice: 1599,
    description: 'Dedicated to the spirit of Onam. Hand-detailed with auspicious floral murals on the pallu and traditional broad golden kasavu borders.',
    images: ['/saree2.png', '/saree5.png', '/hero-saree.png']
  },
  'Aari Work Kurthis': {
    name: 'Designer Aari Work Raw Silk Kurthi Set with Organza Dupatta',
    fabric: 'Raw Silk Kurthi with Cotton Silk Pants',
    occasion: 'Festive Parties, Sangeet & Gatherings',
    zariType: 'Handcrafted Zardozi & Aari Needlework',
    blouseIncluded: 'Ready-to-Wear 3-Piece Kurthi Set',
    color: 'Teal Blue & Antique Gold',
    colorHex: '#0f766e',
    price: 1299,
    originalPrice: 2499,
    description: 'Stunning handcrafted Aari embroidery adorns the neckline and sleeve cuffs of this premium raw silk kurthi. Comes with tailored pants and an embroidered organza dupatta.',
    images: ['/new_arrival_3.png', '/new_arrival_1.png', '/menu_saree_editorial.png'],
    type: 'kurthi'
  }
}

async function seedMissingSubcategoryProducts() {
  console.log('=== Starting Seed for Missing Subcategory Products ===')
  await sequelize.authenticate()

  // 1. Fetch all child categories
  const [categories] = await sequelize.query(`
    SELECT c.id, c.parent_id, c.name, c.slug, c.section, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON (p.category_id = c.id OR p.sub_category_id = c.id) AND p.deleted_at IS NULL
    WHERE c.parent_id IS NOT NULL AND c.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.parent_id, c.id
  `) as [any[], unknown]

  const emptyCategories = categories.filter(c => Number(c.product_count) === 0)
  console.log(`Found ${emptyCategories.length} subcategories without products.`)

  let addedCount = 0

  for (const cat of emptyCategories) {
    const template = SUBCATEGORY_PRODUCT_TEMPLATES[cat.name] || {
      name: `${cat.name} Handloom Designer Saree`,
      fabric: cat.name,
      occasion: 'Festive & Traditional Celebrations',
      zariType: 'Rich Gold Zari Border',
      blouseIncluded: 'Unstitched Contrast Blouse Piece (0.8m)',
      color: 'Classic Festive Multi',
      colorHex: '#b45309',
      price: 899,
      originalPrice: 1699,
      description: `Exquisitely handcrafted ${cat.name} showcasing heritage craftsmanship, opulent borders, and comfortable lightweight drape. Perfect for traditional functions and celebrations.`,
      images: ['/saree1.png', '/saree2.png', '/heritage_silk.png'],
      type: 'saree'
    }

    const baseSlug = slugify(template.name)
    const productCode = `A1-${cat.id}-${Math.floor(100 + Math.random() * 900)}`
    
    // Ensure slug uniqueness
    let finalSlug = baseSlug
    let counter = 1
    while (await Product.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`
      counter++
    }

    const isKurthi = template.type === 'kurthi' || cat.name.toLowerCase().includes('kurthi')

    // Create the Product record
    const newProduct = await Product.create({
      code: productCode,
      name: template.name,
      slug: finalSlug,
      type: template.type || (isKurthi ? 'kurthi' : 'saree'),
      description: template.description,
      category: cat.name,
      categoryId: cat.id,
      subCategoryId: cat.id,
      price: template.price,
      originalPrice: template.originalPrice,
      stockQty: 18,
      lowStockThreshold: 5,
      enableBackInStockNotify: false,
      imageUrl: template.images[0],
      color: template.color,
      gender: 'women',
      ageGroup: 'adult',
      hasVariants: true,
      status: 'active',
      featured: true,
      isNew: true,
      isBestSeller: false,
      sortOrder: cat.id,
      gstRate: 5.00,
      metadata: {
        fabric: template.fabric,
        occasion: template.occasion,
        zariType: template.zariType,
        sareeLength: isKurthi ? 'Standard Kurti Length' : '6.3 Meters (with blouse)',
        blouseIncluded: template.blouseIncluded,
        washCare: isKurthi ? 'Gentle Hand Wash / Dry Clean' : 'Dry Clean Recommended'
      }
    })

    const prodId = (newProduct as any).id

    // Create default variant
    await ProductVariant.create({
      productId: prodId,
      variantType: 'color',
      label: template.color,
      colorName: template.color,
      colorHex: template.colorHex,
      size: isKurthi ? 'M' : 'Free Size',
      sizes: isKurthi ? ['M', 'L', 'XL'] : ['Free Size'],
      sku: `${productCode}-V1`,
      price: template.price,
      originalPrice: template.originalPrice,
      stockQty: 18,
      sizeStock: isKurthi ? { M: 6, L: 6, XL: 6 } : { 'Free Size': 18 }
    })

    // Create ProductImage records for gallery
    for (let i = 0; i < template.images.length; i++) {
      await ProductImage.create({
        productId: prodId,
        imageUrl: template.images[i],
        altText: `${template.name} - View ${i + 1}`,
        sortOrder: i
      })
    }

    // Ensure category nav_visible is enabled
    await Category.update({ navVisible: true, active: true }, { where: { id: cat.id } })

    addedCount++
    console.log(`[${addedCount}/${emptyCategories.length}] Added product to subcategory #${cat.id} (${cat.name}): "${template.name}"`)
  }

  // Final verification
  const [verifyRows] = await sequelize.query(`
    SELECT c.id, c.name, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON (p.category_id = c.id OR p.sub_category_id = c.id) AND p.deleted_at IS NULL
    WHERE c.parent_id IS NOT NULL AND c.deleted_at IS NULL
    GROUP BY c.id
    HAVING product_count = 0
  `) as [any[], unknown]

  console.log('\n=== Seeding Summary ===')
  console.log(`Successfully created ${addedCount} products across ${emptyCategories.length} subcategories.`)
  console.log(`Remaining empty subcategories: ${verifyRows.length}`)

  process.exit(0)
}

seedMissingSubcategoryProducts().catch(err => {
  console.error('Error seeding products:', err)
  process.exit(1)
})
