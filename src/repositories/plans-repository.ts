import type { InferSelectModel } from 'drizzle-orm'
import type { plans } from '../db/schema'

export type Plans = InferSelectModel<typeof plans>

export interface PlansRepository {
  findBySlug(slug: string): Promise<Plans | null>
  findById(id: string): Promise<Plans | null>
}
