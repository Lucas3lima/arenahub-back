import z from 'zod'

export const companySettingsSchema = z.object({
  onlineReservationsEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
  onlineBookingRequiresDeposit: z.boolean(),
  onlineBookingDepositPercent: z.int().min(0).max(100),
})

export const companyPlanFeaturesSchema = z.object({
  slug: z.string(),
  name: z.string(),
  hasOnlineReservations: z.boolean(),
  hasOnlinePayment: z.boolean(),
})

export const effectiveCompanySettingsSchema = z.object({
  canUseOnlineReservations: z.boolean(),
  canUseOnlinePayment: z.boolean(),
  requiresOnlineDeposit: z.boolean(),
  depositPercent: z.int().min(0).max(100),
})

export const companySettingsResponseSchema = z.object({
  companyId: z.string(),
  companySlug: z.string(),
  plan: companyPlanFeaturesSchema,
  settings: companySettingsSchema,
  effective: effectiveCompanySettingsSchema,
})
