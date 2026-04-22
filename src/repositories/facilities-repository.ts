import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { facilities } from '../db/schema'

export type Facility = InferSelectModel<typeof facilities>
export type CreateFacilityInput = InferInsertModel<typeof facilities>

export interface FacilitiesRepository {
  create(data: CreateFacilityInput): Promise<Facility>
  countByCompanyId(companyId: string): Promise<number>
  findBySlugAndCompanyId(slug: string, companyId: string): Promise<Facility | null>
}
