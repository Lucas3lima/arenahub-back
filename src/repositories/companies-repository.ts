import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { companies } from '../db/schema'

export type Companies = InferSelectModel<typeof companies>
export type CreateCompaniesInput = InferInsertModel<typeof companies>

export interface CompaniesRepository {
  create(data: CreateCompaniesInput): Promise<Companies>
  findBySlug(slug: string): Promise<Companies | null>
  findById(id: string): Promise<Companies | null>
}
