import z from 'zod'

export const sportTypeSchema = z.enum([
  'futebol',
  'volei',
  'tenis',
  'beach_tennis',
  'padel',
  'areia',
  'outro',
])

export const courtStatusSchema = z.enum(['open', 'closed', 'maintenance'])

export const openingHoursGroupSchema = z.object({
  weekdays: z.array(z.int().min(0).max(6)).min(1),
  startMinute: z.int().min(0).max(1439),
  endMinute: z.int().min(1).max(1440),
})

export const weekdayPriceSchema = z.object({
  weekday: z.int().min(0).max(6),
  priceCents: z.int().min(0),
})

export const courtResponseSchema = z.object({
  courtId: z.string(),
  facilityId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sportType: sportTypeSchema,
  status: courtStatusSchema,
  basePriceCents: z.int(),
  rentalDurationMinutes: z.int(),
  bufferMinutes: z.int(),
  isActive: z.boolean(),
  openingHours: z.array(openingHoursGroupSchema),
  weekdayPrices: z.array(weekdayPriceSchema),
})
