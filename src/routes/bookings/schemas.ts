import z from 'zod'

export const bookingStatusSchema = z.enum([
  'pending_payment',
  'confirmed',
  'cancelled',
  'expired',
])

export const bookingSourceSchema = z.enum(['public', 'staff'])
export const bookingPricingRuleSchema = z.enum(['base', 'weekday', 'override'])
export const paymentStatusSchema = z.enum(['unpaid', 'paid', 'partial', 'refunded'])
export const paymentMethodSchema = z.enum(['cash', 'card', 'pix', 'online'])

export const bookingResponseSchema = z.object({
  bookingId: z.string(),
  companyId: z.string(),
  courtId: z.string(),
  courtName: z.string(),
  facilityName: z.string(),
  facilitySlug: z.string(),
  customerName: z.string(),
  customerPhone: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerDocument: z.string().nullable(),
  startsAt: z.date(),
  endsAt: z.date(),
  status: bookingStatusSchema,
  source: bookingSourceSchema,
  notes: z.string().nullable(),
  totalPriceCents: z.int(),
  pricingRule: bookingPricingRuleSchema,
  paymentStatus: paymentStatusSchema,
  paymentMethod: paymentMethodSchema.nullable(),
  paidAt: z.date().nullable(),
  paymentExpiresAt: z.date().nullable(),
  externalPaymentId: z.string().nullable(),
  cancelledAt: z.date().nullable(),
  cancelledByUserId: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const availabilitySlotSchema = z.object({
  startsAt: z.date(),
  endsAt: z.date(),
  isAvailable: z.boolean(),
  totalPriceCents: z.int(),
  pricingRule: bookingPricingRuleSchema,
})
