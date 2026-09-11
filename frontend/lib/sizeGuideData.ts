export type SizeGuideEntry = {
  label: string
  measurements: Record<string, string>
}

const SIZE_GUIDE: Record<string, SizeGuideEntry[]> = {
  women: [
    { label: 'XS', measurements: { Bust: '32"', Waist: '26"', Hip: '34"' } },
    { label: 'S', measurements: { Bust: '34"', Waist: '28"', Hip: '36"' } },
    { label: 'M', measurements: { Bust: '36"', Waist: '30"', Hip: '38"' } },
    { label: 'L', measurements: { Bust: '38"', Waist: '32"', Hip: '40"' } },
    { label: 'XL', measurements: { Bust: '41"', Waist: '35"', Hip: '43"' } },
    { label: 'XXL', measurements: { Bust: '44"', Waist: '38"', Hip: '46"' } },
    { label: '3XL', measurements: { Bust: '47"', Waist: '41"', Hip: '49"' } },
  ],
  men: [
    { label: 'S', measurements: { Chest: '36"', Waist: '30"', Length: '28"' } },
    { label: 'M', measurements: { Chest: '38"', Waist: '32"', Length: '29"' } },
    { label: 'L', measurements: { Chest: '40"', Waist: '34"', Length: '30"' } },
    { label: 'XL', measurements: { Chest: '42"', Waist: '36"', Length: '31"' } },
    { label: 'XXL', measurements: { Chest: '44"', Waist: '38"', Length: '32"' } },
    { label: '3XL', measurements: { Chest: '46"', Waist: '40"', Length: '33"' } },
    { label: '4XL', measurements: { Chest: '48"', Waist: '42"', Length: '34"' } },
  ],
  kids: [
    { label: '0-6M', measurements: { Height: '68 cm', Weight: '8 kg' } },
    { label: '6-12M', measurements: { Height: '76 cm', Weight: '10 kg' } },
    { label: '1-2Y', measurements: { Height: '86 cm', Weight: '12 kg' } },
    { label: '2-3Y', measurements: { Height: '96 cm', Weight: '14 kg' } },
    { label: '3-4Y', measurements: { Height: '104 cm', Weight: '16 kg' } },
    { label: '4-5Y', measurements: { Height: '110 cm', Weight: '18 kg' } },
    { label: '5-6Y', measurements: { Height: '116 cm', Weight: '20 kg' } },
    { label: '6-7Y', measurements: { Height: '122 cm', Weight: '22 kg' } },
    { label: '7-8Y', measurements: { Height: '128 cm', Weight: '25 kg' } },
    { label: '8-10Y', measurements: { Height: '140 cm', Weight: '30 kg' } },
    { label: '10-12Y', measurements: { Height: '150 cm', Weight: '35 kg' } },
    { label: '12-14Y', measurements: { Height: '160 cm', Weight: '40 kg' } },
  ],
  unisex: [
    { label: 'Free Size', measurements: { Chest: '38-40"', Waist: '30-32"', Length: '28"' } },
    { label: 'S', measurements: { Chest: '36"', Waist: '28"', Length: '27"' } },
    { label: 'M', measurements: { Chest: '38"', Waist: '30"', Length: '28"' } },
    { label: 'L', measurements: { Chest: '40"', Waist: '32"', Length: '29"' } },
    { label: 'XL', measurements: { Chest: '42"', Waist: '34"', Length: '30"' } },
    { label: 'XXL', measurements: { Chest: '44"', Waist: '36"', Length: '31"' } },
  ],
}

export default SIZE_GUIDE
