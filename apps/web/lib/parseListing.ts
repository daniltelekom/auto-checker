export interface ParsedListing {
  make: string | null
  model: string | null
  year: number | null
  mileage: number | null
  price: number | null
  engine: string | null
  transmission: string | null
  bodyType: string | null
  color: string | null
  owners: number | null
  description: string
}

type CarEntry = {
  make: string
  models: string[]
  aliases?: string[]
}

const CAR_DATABASE: CarEntry[] = [
  { make: "Toyota", models: ["Land Cruiser", "Highlander", "RAV4", "Camry", "Corolla", "Prius", "Hilux", "Yaris", "Avensis", "C-HR", "Fortuner", "Alphard"] },
  { make: "BMW", models: ["X7", "X6", "X5", "X4", "X3", "X2", "X1", "7 Series", "6 Series", "5 Series", "4 Series", "3 Series", "2 Series", "1 Series", "M5", "M3", "iX", "i4", "i3"] },
  { make: "Mercedes-Benz", models: ["GLE", "GLS", "GLC", "GLB", "GLA", "G-Class", "E-Class", "S-Class", "C-Class", "A-Class", "CLA", "CLS", "ML", "GL", "V-Class", "Sprinter"], aliases: ["Mercedes", "Мерседес"] },
  { make: "Audi", models: ["Q8", "Q7", "Q5", "Q3", "Q2", "A8", "A7", "A6", "A5", "A4", "A3", "TT", "e-tron", "RS6", "RS5", "RS3"] },
  { make: "Volkswagen", models: ["Touareg", "Tiguan", "Passat", "Golf", "Polo", "Jetta", "Amarok", "Transporter", "Multivan", "Taos", "Arteon", "ID.4"], aliases: ["VW", "Фольксваген"] },
  { make: "Kia", models: ["Sportage", "Sorento", "Cerato", "Rio", "K5", "Ceed", "Soul", "Optima", "Stinger", "Mohave", "Carnival", "Seltos", "K3", "Picanto"] },
  { make: "Hyundai", models: ["Santa Fe", "Tucson", "Creta", "Solaris", "Elantra", "Sonata", "Palisade", "i30", "i40", "ix35", "Accent", "Staria", "Kona"] },
  { make: "Lada", models: ["Vesta", "Granta", "Largus", "Niva", "Kalina", "Priora", "XRAY", "XRay", "2114", "2115", "2107", "2109"], aliases: ["ВАЗ", "LADA"] },
  { make: "Renault", models: ["Duster", "Logan", "Sandero", "Kaptur", "Arkana", "Megane", "Fluence", "Scenic", "Koleos", "Talisman", "Kangoo"] },
  { make: "Nissan", models: ["X-Trail", "Qashqai", "Murano", "Patrol", "Teana", "Almera", "Juke", "Note", "Pathfinder", "Terrano", "Leaf", "Sentra"] },
  { make: "Mazda", models: ["CX-9", "CX-5", "CX-30", "CX-3", "Mazda6", "Mazda3", "Mazda2", "MX-5", "BT-50"] },
  { make: "Ford", models: ["Explorer", "Mondeo", "Focus", "Kuga", "Fiesta", "Transit", "Ranger", "Mustang", "EcoSport", "Galaxy", "Fusion", "Edge"] },
  { make: "Chevrolet", models: ["Tahoe", "Captiva", "Cruze", "Aveo", "Niva", "Lacetti", "Orlando", "Traverse", "Camaro", "Corvette", "Spark", "Malibu"] },
  { make: "Skoda", models: ["Kodiaq", "Karoq", "Octavia", "Superb", "Rapid", "Fabia", "Yeti", "Kamiq", "Scala", "Roomster"] },
  { make: "Honda", models: ["CR-V", "Civic", "Accord", "Pilot", "Fit", "HR-V", "Odyssey", "Jazz", "City"] },
  { make: "Lexus", models: ["RX", "NX", "GX", "LX", "ES", "IS", "UX", "LS", "LC", "CT"] },
  { make: "Mitsubishi", models: ["Outlander", "Pajero", "Lancer", "ASX", "Eclipse Cross", "L200", "Colt", "Galant"] },
  { make: "Volvo", models: ["XC90", "XC60", "XC40", "S90", "S60", "V90", "V60", "V40", "C40"] },
  { make: "Subaru", models: ["Forester", "Outback", "Impreza", "Legacy", "XV", "WRX", "Crosstrek", "Ascent"] },
  { make: "Chery", models: ["Tiggo 8", "Tiggo 7", "Tiggo 4", "Tiggo", "Arrizo", "Bonus", "Amulet", "IndiS"] },
  { make: "Geely", models: ["Monjaro", "Coolray", "Atlas", "Emgrand", "Tugella", "Okavango", "Preface"] },
  { make: "Haval", models: ["Dargo", "Jolion", "F7", "H6", "H9", "M6", "F7x"] },
  { make: "Changan", models: ["CS75", "CS55", "CS35", "Alsvin", "UNI-K", "UNI-T", "Eado"] },
  { make: "Exeed", models: ["VX", "TXL", "LX", "RX"] },
  { make: "Omoda", models: ["C5", "S5"] },
  { make: "Jaecoo", models: ["J8", "J7"] },
  { make: "Tank", models: ["500", "300"] },
  { make: "BYD", models: ["Atto 3", "Song", "Tang", "Han", "Seal", "Dolphin"] },
  { make: "Land Rover", models: ["Range Rover Sport", "Range Rover", "Discovery", "Defender", "Evoque", "Freelander", "Velar"] },
  { make: "Jeep", models: ["Grand Cherokee", "Cherokee", "Wrangler", "Compass", "Renegade", "Gladiator"] },
  { make: "Porsche", models: ["Cayenne", "Macan", "Panamera", "Taycan", "911", "Boxster", "Cayman"] },
  { make: "Infiniti", models: ["QX80", "QX60", "QX50", "QX30", "Q50", "Q60", "FX35", "FX37", "G37", "EX35"] },
  { make: "Opel", models: ["Insignia", "Astra", "Corsa", "Mokka", "Zafira", "Antara", "Vectra", "Meriva"] },
  { make: "Peugeot", models: ["3008", "2008", "5008", "408", "308", "301", "Partner", "Boxer", "107", "206", "207"] },
  { make: "Citroen", models: ["C5", "C4", "C3", "Berlingo", "Jumper", "DS4", "Xsara", "C-Crosser"], aliases: ["Citroën"] },
  { make: "Suzuki", models: ["Grand Vitara", "Vitara", "Swift", "Jimny", "SX4", "Ignis", "Baleno"] },
  { make: "UAZ", models: ["Patriot", "Hunter", "Pickup", "Profi", "Буханка"], aliases: ["УАЗ"] },
  { make: "GAZ", models: ["Volga", "Sobol", "Gazelle", "Газель"], aliases: ["ГАЗ"] },
  { make: "Datsun", models: ["on-DO", "mi-DO", "mi-DO"] },
  { make: "Genesis", models: ["GV80", "GV70", "G80", "G70", "GV60"] },
  { make: "Cadillac", models: ["Escalade", "XT5", "XT6", "CTS", "SRX", "CT5"] },
  { make: "Jaguar", models: ["F-Pace", "E-Pace", "XF", "XJ", "XE", "I-Pace"] },
  { make: "Mini", models: ["Countryman", "Cooper", "Clubman", "Paceman"] },
  { make: "SsangYong", models: ["Rexton", "Kyron", "Actyon", "Korando", "Tivoli"] },
  { make: "Dodge", models: ["Durango", "Challenger", "Charger", "Ram", "Journey", "Caliber"] },
  { make: "Chrysler", models: ["300C", "Pacifica", "Voyager", "Sebring"] },
  { make: "Tesla", models: ["Model Y", "Model X", "Model S", "Model 3", "Cybertruck"] },
  { make: "Fiat", models: ["Ducato", "Doblo", "500", "Punto", "Tipo", "Fullback"] },
  { make: "Seat", models: ["Leon", "Ibiza", "Ateca", "Arona", "Alhambra"] },
  { make: "Lifan", models: ["X60", "X50", "Solano", "Smily", "Breez"] },
  { make: "Great Wall", models: ["Hover", "Poer", "Wingle", "Safe"] },
  { make: "Isuzu", models: ["D-Max", "MU-X"] },
  { make: "Daewoo", models: ["Nexia", "Matiz", "Lacetti", "Gentra"] },
  { make: "Ravon", models: ["R4", "R2", "Nexia", "Gentra"] },
  { make: "Zeekr", models: ["001", "X", "009"] },
  { make: "Jetour", models: ["Dashing", "X70", "X90", "T2"] },
  { make: "Belgee", models: ["X50", "X70"] },
  { make: "Moskvich", models: ["3", "3e", "6"], aliases: ["Москвич"] },
]

const TRANSMISSION_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bвариатор\b|\bcvt\b/i, value: "вариатор" },
  { pattern: /\bробот\b|\bamt\b|\bdct\b|\bdsg\b/i, value: "робот" },
  { pattern: /\bавтомат\b|\bакпп\b|\bat\b|\bавтоматическая\b/i, value: "автомат" },
  { pattern: /\bмеханика\b|\bмкпп\b|\bmt\b|\bручн(?:ая|ой)\b|\bмеханическая\b/i, value: "механика" },
]

const BODY_TYPE_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bвнедорожник\b|\bджип\b|\bsuv\b/i, value: "внедорожник" },
  { pattern: /\bкроссовер\b/i, value: "кроссовер" },
  { pattern: /\bуниверсал\b/i, value: "универсал" },
  { pattern: /\bхэтчбек\b|\bхетчбек\b|\bхетчбэк\b/i, value: "хэтчбек" },
  { pattern: /\bлифтбек\b/i, value: "лифтбек" },
  { pattern: /\bседан\b/i, value: "седан" },
  { pattern: /\bминивэн\b|\bминивен\b/i, value: "минивэн" },
  { pattern: /\bкупе\b/i, value: "купе" },
  { pattern: /\bкабриолет\b|\bкабрио\b/i, value: "кабриолет" },
  { pattern: /\bпикап\b/i, value: "пикап" },
  { pattern: /\bфургон\b/i, value: "фургон" },
]

const COLOR_KEYWORDS = [
  "перламутровый",
  "серебристый",
  "золотистый",
  "бордовый",
  "фиолетовый",
  "коричневый",
  "оранжевый",
  "бежевый",
  "голубой",
  "зелёный",
  "зеленый",
  "жёлтый",
  "желтый",
  "чёрный",
  "черный",
  "белый",
  "серый",
  "синий",
  "красный",
]

type ModelMatch = {
  make: string
  model: string
  index: number
}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ")
}

function parseNumber(value: string): number {
  return Number(value.replace(/\s/g, "").replace(",", "."))
}

function parseYear(text: string): number | null {
  const patterns = [
    /\b(19[89]\d|20[0-2]\d)\s*(?:г\.?\s*в\.?|год(?:\s+выпуска)?|г\.?)\b/i,
    /\bвыпуск[:\s]+(19[89]\d|20[0-2]\d)\b/i,
    /\b(19[89]\d|20[0-2]\d)\s*г\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const year = Number(match[1])
      if (year >= 1980 && year <= new Date().getFullYear() + 1) {
        return year
      }
    }
  }

  const fallback = text.match(/\b(20(?:1[0-9]|2[0-6])|19(?:8\d|9\d))\b/)
  if (fallback?.[1]) {
    return Number(fallback[1])
  }

  return null
}

function parseMileage(text: string): number | null {
  const patterns = [
    /пробег[:\s]*(\d[\d\s]*)\s*(?:тыс\.?|т\.?)?\s*км/i,
    /(\d[\d\s]*)\s*(?:тыс\.?|т\.?)\s*км/i,
    /(\d[\d\s]*)\s*км/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) {
      continue
    }

    const raw = match[0].toLowerCase()
    const value = parseNumber(match[1])

    if (raw.includes("тыс") || raw.includes(" т.")) {
      return value * 1000
    }

    if (value >= 1000) {
      return value
    }
  }

  return null
}

function parsePrice(text: string): number | null {
  const millionMatch = text.match(
    /(?:цена[:\s]*)?(\d+(?:[.,]\d+)?)\s*млн(?:\s*(?:₽|руб\.?|р\.?))?/i
  )

  if (millionMatch?.[1]) {
    return Math.round(parseNumber(millionMatch[1]) * 1_000_000)
  }

  const priceLineMatch = text.match(
    /цена[:\s]*([\d\s]+)\s*(?:₽|руб\.?|р\.?)/i
  )

  if (priceLineMatch?.[1]) {
    const value = parseNumber(priceLineMatch[1])

    if (value >= 10_000) {
      return value
    }
  }

  const allPrices = [...text.matchAll(/([\d][\d\s]*)\s*(?:₽|руб\.?|р\.?)/gi)]
  const candidates = allPrices
    .map((match) => (match[1] ? parseNumber(match[1]) : 0))
    .filter((value) => value >= 50_000)

  if (candidates.length > 0) {
    return Math.max(...candidates)
  }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findIndex(text: string, value: string): number {
  const pattern = new RegExp(`\\b${escapeRegExp(value)}\\b`, "i")
  const match = pattern.exec(text)
  return match?.index ?? -1
}

function parseMakeModel(text: string): { make: string | null; model: string | null } {
  const normalized = normalizeText(text)
  const modelMatches: ModelMatch[] = []

  for (const entry of CAR_DATABASE) {
    for (const model of entry.models) {
      const index = findIndex(normalized, model)
      if (index >= 0) {
        modelMatches.push({ make: entry.make, model, index })
      }
    }
  }

  if (modelMatches.length > 0) {
    modelMatches.sort((a, b) => {
      if (b.model.length !== a.model.length) {
        return b.model.length - a.model.length
      }
      return a.index - b.index
    })

    const best = modelMatches[0]!
    return {
      make: best.make,
      model: best.model,
    }
  }

  let makeMatch: { make: string; index: number } | null = null

  for (const entry of CAR_DATABASE) {
    const names = [entry.make, ...(entry.aliases ?? [])]
    for (const name of names) {
      const index = findIndex(normalized, name)
      if (index >= 0 && (!makeMatch || index < makeMatch.index)) {
        makeMatch = { make: entry.make, index }
      }
    }
  }

  return {
    make: makeMatch?.make ?? null,
    model: null,
  }
}

function parseEngine(text: string): string | null {
  const parts: string[] = []

  const volumeMatch = text.match(/\b(\d[.,]\d)\s*(?:л|литр(?:а|ов)?)\b/i)
  if (volumeMatch?.[1]) {
    parts.push(`${volumeMatch[1].replace(",", ".")} л`)
  }

  const fuelPatterns: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /\bдизель(?:ный)?\b|\bdiesel\b/i, value: "дизель" },
    { pattern: /\bбензин(?:овый)?\b|\bpetrol\b|\bgasoline\b/i, value: "бензин" },
    { pattern: /\bгибрид\b|\bhybrid\b/i, value: "гибрид" },
    { pattern: /\bэлектро\b|\belectric\b/i, value: "электро" },
    { pattern: /\bгаз\b|\blpg\b|\bпропан\b/i, value: "газ" },
  ]

  for (const { pattern, value } of fuelPatterns) {
    if (pattern.test(text)) {
      parts.push(value)
      break
    }
  }

  const turboMatch = text.match(/\bтурбо\b|\bturbo\b/i)
  if (turboMatch) {
    parts.push("турбо")
  }

  return parts.length > 0 ? parts.join(", ") : null
}

function parseTransmission(text: string): string | null {
  for (const { pattern, value } of TRANSMISSION_KEYWORDS) {
    if (pattern.test(text)) {
      return value
    }
  }

  return null
}

function parseBodyType(text: string): string | null {
  for (const { pattern, value } of BODY_TYPE_KEYWORDS) {
    if (pattern.test(text)) {
      return value
    }
  }

  return null
}

function parseColor(text: string): string | null {
  const normalized = text.toLowerCase()

  for (const color of COLOR_KEYWORDS) {
    if (new RegExp(`\\b${escapeRegExp(color)}\\b`, "i").test(normalized)) {
      return color.replace("ё", "е")
    }
  }

  const colorLabelMatch = text.match(
    /цвет[:\s]+([а-яёa-z-]+(?:\s+[а-яёa-z-]+)?)/i
  )
  if (colorLabelMatch?.[1]) {
    return colorLabelMatch[1].trim().toLowerCase().replace("ё", "е")
  }

  return null
}

function parseOwners(text: string): number | null {
  const patterns = [
    /\b(\d)\s*\+\s*владел/i,
    /\b(\d)\s*владел(?:ец|ца|ев|ьца)?\b/i,
    /\bвладельц(?:ев|а)?[:\s]*(\d)\b/i,
    /\b(\d)\s*х?\s*собственник/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return Number(match[1])
    }
  }

  if (/\bпо\s+птс\b/i.test(text)) {
    return null
  }

  return null
}

export function parseListing(text: string): ParsedListing {
  const normalized = normalizeText(text.trim())

  const { make, model } = parseMakeModel(normalized)

  return {
    make,
    model,
    year: parseYear(normalized),
    mileage: parseMileage(normalized),
    price: parsePrice(normalized),
    engine: parseEngine(normalized),
    transmission: parseTransmission(normalized),
    bodyType: parseBodyType(normalized),
    color: parseColor(normalized),
    owners: parseOwners(normalized),
    description: text,
  }
}
