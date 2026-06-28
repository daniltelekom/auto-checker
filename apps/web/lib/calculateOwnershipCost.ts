export interface CostBreakdown {
  tax: number
  insurance: number
  maintenance: number
  fuel: number
  depreciation: number
  totalYear: number
  totalMonth: number
}

export function calculateOwnershipCost(params: {
  enginePower: number | null
  year: number | null
  price: number | null
  annualMileage?: number
}): CostBreakdown {
  const annualMileage = params.annualMileage || 15000
  
  // Налог (упрощенная формула для РФ)
  const tax = params.enginePower 
    ? params.enginePower <= 100 ? params.enginePower * 12 
    : params.enginePower <= 150 ? params.enginePower * 25 
    : params.enginePower * 50
    : 0

  // ОСАГО (среднее)
  const insurance = 8500

  // ТО и ремонт (зависит от года и цены)
  const age = params.year ? new Date().getFullYear() - params.year : 5
  const maintenance = age <= 3 ? 15000 : age <= 7 ? 25000 : 40000

  // Бензин (средний расход 8л/100км, цена 55₽/л)
  const fuel = Math.round((annualMileage / 100) * 8 * 55)

  // Амортизация (10-15% в год от цены)
  const depreciation = params.price ? Math.round(params.price * 0.12) : 0

  const totalYear = tax + insurance + maintenance + fuel + depreciation
  
  return {
    tax,
    insurance,
    maintenance,
    fuel,
    depreciation,
    totalYear,
    totalMonth: Math.round(totalYear / 12)
  }
}
