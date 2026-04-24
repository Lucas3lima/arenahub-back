import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Enums para padronizar os dados
export const planEnum = pgEnum('plan', ['free_trial', 'start', 'growth', 'pro'])
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'staff'])
export const sportTypeEnum = pgEnum('sport_type', [
  'futebol',
  'volei',
  'tenis',
  'beach_tennis',
  'padel',
  'areia',
  'outro',
])
export const courtStatusEnum = pgEnum('court_status', [
  'open',
  'closed',
  'maintenance',
])
export const bookingStatusEnum = pgEnum('booking_status', [
  'pending_payment',
  'confirmed',
  'cancelled',
])
export const membershipStatusEnum = pgEnum('membership_status', [
  'active',
  'paused',
  'cancelled',
])
export const classStatusEnum = pgEnum('class_status', [
  'scheduled',
  'cancelled',
])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
])

export const plans = pgTable('plans', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text().notNull(),
  price: integer().notNull(),

  maxCourts: integer().notNull(),
  maxUsers: integer().notNull(),
  maxFacilities: integer().notNull(),
  trialDays: integer().default(0).notNull(),

  hasAdvancedReports: boolean().default(false).notNull(),
  hasCustomPermissions: boolean().default(false).notNull(),
  hasCancellationPolicies: boolean().default(false).notNull(),
  hasPublicPage: boolean().default(true).notNull(),
  hasOnlineReservations: boolean().default(true).notNull(),
  hasFinancialControl: boolean().default(true).notNull(),
  hasOnlinePayment: boolean().default(false).notNull(),

  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const defaultPlansSeed = [
  {
    name: 'Free Trial',
    slug: 'free_trial',
    description: 'Período de teste gratuito com funcionalidades iniciais.',
    price: 0,
    maxCourts: 2,
    maxUsers: 3,
    maxFacilities: 1,
    trialDays: 14,
    hasPublicPage: true,
    hasOnlineReservations: true,
    hasFinancialControl: true,
  },
  {
    name: 'Start',
    slug: 'start',
    description: 'Plano base para operações iniciantes.',
    price: 9990,
    maxCourts: 2,
    maxUsers: 3,
    maxFacilities: 1,
    trialDays: 0,
    hasPublicPage: true,
    hasOnlineReservations: true,
    hasFinancialControl: true,
  },
  {
    name: 'Growth',
    slug: 'growth',
    description: 'Plano para arenas em crescimento.',
    price: 15990,
    maxCourts: 5,
    maxUsers: 8,
    maxFacilities: 1,
    trialDays: 0,
    hasAdvancedReports: true,
    hasCustomPermissions: true,
    hasCancellationPolicies: true,
    hasPublicPage: true,
    hasOnlineReservations: true,
    hasFinancialControl: true,
    hasOnlinePayment: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Plano para operações robustas com múltiplas unidades.',
    price: 23000,
    maxCourts: -1,
    maxUsers: -1,
    maxFacilities: 3,
    trialDays: 0,
    hasAdvancedReports: true,
    hasCustomPermissions: true,
    hasCancellationPolicies: true,
    hasPrioritySupport: true,
    hasAuditLogs: true,
    hasPublicPage: true,
    hasOnlineReservations: true,
    hasFinancialControl: true,
    hasOnlinePayment: true,
  },
] as const

// 1. USUÁRIOS (Donos e Funcionários)
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// 2. EMPRESAS (A conta principal do SaaS)
export const companies = pgTable('companies', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(), // Ex: arenahub.com/minha-arena

  isActive: boolean().default(true).notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid()
      .references(() => plans.id, { onDelete: 'restrict' })
      .notNull(),
    status: subscriptionStatusEnum('status').default('active').notNull(),
    currentPeriodStartsAt: timestamp({ withTimezone: true }).notNull(),
    currentPeriodEndsAt: timestamp({ withTimezone: true }).notNull(),

    trialEndsAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    externalSubscriptionId: text(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('active_subscription_idx')
      .on(table.companyId)
      .where(sql`${table.status} IN ('trialing', 'active', 'past_due')`),
  ],
)

// 3. VÍNCULO USUÁRIO <-> EMPRESA (Permite convidar funcionários)
export const companyUsers = pgTable(
  'company_users',
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid()
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: userRoleEnum('role').default('staff').notNull(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex().on(table.companyId, table.userId)],
)

// 4. UNIDADES/ARENAS FÍSICAS (Permite o plano Pro ter até 3 unidades)
export const facilities = pgTable(
  'facilities',
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    name: text().notNull(), // Ex: "Unidade Centro", "Unidade Praia"
    slug: text().notNull(),
    address: text(),
    phone: text(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('facility_company_slug_idx').on(table.companyId, table.slug),
  ],
)

// 5. QUADRAS (O produto final que será alugado)
export const courts = pgTable('courts', {
  id: uuid().primaryKey().defaultRandom(),
  facilityId: uuid()
    .references(() => facilities.id, { onDelete: 'cascade' })
    .notNull(),
  name: text().notNull(),
  description: text(),
  sportType: sportTypeEnum('sport_type').notNull(),
  status: courtStatusEnum('status').default('open').notNull(),
  basePriceCents: integer().notNull(),
  rentalDurationMinutes: integer().notNull(),
  bufferMinutes: integer().default(0).notNull(),
  isActive: boolean().default(true).notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const courtOpeningHours = pgTable(
  'court_opening_hours',
  {
    id: uuid().primaryKey().defaultRandom(),
    courtId: uuid()
      .references(() => courts.id, { onDelete: 'cascade' })
      .notNull(),
    weekday: integer().notNull(),
    startMinute: integer().notNull(),
    endMinute: integer().notNull(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('court_opening_hours_unique_range_idx').on(
      table.courtId,
      table.weekday,
      table.startMinute,
      table.endMinute,
    ),
  ],
)

export const courtWeekdayPrices = pgTable(
  'court_weekday_prices',
  {
    id: uuid().primaryKey().defaultRandom(),
    courtId: uuid()
      .references(() => courts.id, { onDelete: 'cascade' })
      .notNull(),
    weekday: integer().notNull(),
    priceCents: integer().notNull(),

    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('court_weekday_prices_court_weekday_idx').on(
      table.courtId,
      table.weekday,
    ),
  ],
)

// 6. RESERVAS AVULSAS
export const bookings = pgTable('bookings', {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid()
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  courtId: uuid()
    .references(() => courts.id, { onDelete: 'cascade' })
    .notNull(),
  customerName: text().notNull(),
  customerPhone: text(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  status: bookingStatusEnum('status').default('pending_payment').notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// 7. MENSALISTAS (SLOTS RECORRENTES)
export const memberships = pgTable('memberships', {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid()
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  courtId: uuid()
    .references(() => courts.id, { onDelete: 'cascade' })
    .notNull(),
  customerName: text().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  recurrenceRule: text().notNull(),
  status: membershipStatusEnum('status').default('active').notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// 8. AULAS/TURMAS
export const classes = pgTable('classes', {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid()
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  courtId: uuid()
    .references(() => courts.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  capacity: integer().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  recurrenceRule: text(),
  status: classStatusEnum('status').default('scheduled').notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// === DEFINIÇÃO DE RELACIONAMENTOS (Para facilitar as queries no Drizzle) ===

export const companiesRelations = relations(companies, ({ many }) => ({
  subscriptions: many(subscriptions),
  companyUsers: many(companyUsers),
  facilities: many(facilities),
  bookings: many(bookings),
  memberships: many(memberships),
  classes: many(classes),
}))

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [subscriptions.companyId],
    references: [companies.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  companyUsers: many(companyUsers),
}))

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyUsers.userId],
    references: [users.id],
  }),
}))

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  company: one(companies, {
    fields: [facilities.companyId],
    references: [companies.id],
  }),
  courts: many(courts),
}))

export const courtsRelations = relations(courts, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [courts.facilityId],
    references: [facilities.id],
  }),
  openingHours: many(courtOpeningHours),
  weekdayPrices: many(courtWeekdayPrices),
}))

export const courtOpeningHoursRelations = relations(
  courtOpeningHours,
  ({ one }) => ({
    court: one(courts, {
      fields: [courtOpeningHours.courtId],
      references: [courts.id],
    }),
  }),
)

export const courtWeekdayPricesRelations = relations(
  courtWeekdayPrices,
  ({ one }) => ({
    court: one(courts, {
      fields: [courtWeekdayPrices.courtId],
      references: [courts.id],
    }),
  }),
)

export const bookingsRelations = relations(bookings, ({ one }) => ({
  company: one(companies, {
    fields: [bookings.companyId],
    references: [companies.id],
  }),
  court: one(courts, {
    fields: [bookings.courtId],
    references: [courts.id],
  }),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  company: one(companies, {
    fields: [memberships.companyId],
    references: [companies.id],
  }),
  court: one(courts, {
    fields: [memberships.courtId],
    references: [courts.id],
  }),
}))

export const classesRelations = relations(classes, ({ one }) => ({
  company: one(companies, {
    fields: [classes.companyId],
    references: [companies.id],
  }),
  court: one(courts, {
    fields: [classes.courtId],
    references: [courts.id],
  }),
}))
