export const DEFAULT_PRICING = {
  markupPercent: 12.5,
  safetyNetPercent: 5,
  supplierDiscountPercent: 0,
  vatPercent: 15,
} as const;

export const DEFAULT_SAVINGS_INPUTS = {
  clientDailyKwh: 800,
  tariffPerKwh: 2.85,
  annualTariffIncrease: 0.08,
  panelDegradationPerYear: 0.01,
  daysPerMonth: 30.48,
} as const;
