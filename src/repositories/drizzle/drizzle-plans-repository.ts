import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { plans } from '../../db/schema'
import type { PlansRepository } from '../plans-repository'

export class DrizzlePlansRepository implements PlansRepository {
  async findBySlug(slug: string) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, slug))
      .limit(1)
    if (!plan) {
      return null
    }
    return plan
  }

  async findById(id: string) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1)
    if (!plan) {
      return null
    }
    return plan
  }
}
