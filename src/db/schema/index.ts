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
import { relations } from 'drizzle-orm'

// Enums para padronizar os dados
export const planEnum = pgEnum('plan', ['free_trial', 'start', 'growth', 'pro'])
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'staff'])
export const sportTypeEnum = pgEnum('sport_type', [
  'futebol',
  'volei',
  'tenis',
  'beach_tennis',
  'outro',
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

// 1. EMPRESAS (A conta principal do SaaS)
// Controla a assinatura, o trial e agrupa todas as unidades físicas.
export const companies = pgTable('companies', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(), // Ex: arenahub.com/minha-arena

  // Controle de Assinatura e Trial
  currentPlan: planEnum('current_plan').default('free_trial').notNull(),
  trialEndsAt: timestamp({ withTimezone: true }).notNull(),
  isActive: boolean().default(true).notNull(),
  maxCourts: integer(),
  maxFacilities: integer(),
  maxUsers: integer(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// 2. USUÁRIOS (Donos e Funcionários)
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

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
export const facilities = pgTable('facilities', {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid()
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text().notNull(), // Ex: "Unidade Centro", "Unidade Praia"
  address: text(),
  phone: text(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

// 5. QUADRAS (O produto final que será alugado)
export const courts = pgTable('courts', {
  id: uuid().primaryKey().defaultRandom(),
  facilityId: uuid()
    .references(() => facilities.id, { onDelete: 'cascade' })
    .notNull(),
  name: text().notNull(), // Ex: "Quadra 1 - Areia", "Campo Society A"
  sportType: sportTypeEnum('sport_type').notNull(),
  isActive: boolean().default(true).notNull(),

  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

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
  companyUsers: many(companyUsers),
  facilities: many(facilities),
  bookings: many(bookings),
  memberships: many(memberships),
  classes: many(classes),
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

export const courtsRelations = relations(courts, ({ one }) => ({
  facility: one(facilities, {
    fields: [courts.facilityId],
    references: [facilities.id],
  }),
}))

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
