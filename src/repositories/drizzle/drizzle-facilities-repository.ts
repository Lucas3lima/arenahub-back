import { and, count, eq } from 'drizzle-orm'
import { db } from '../../db'
import { facilities } from '../../db/schema'
import type {
  CreateFacilityInput,
  FacilitiesRepository,
} from '../facilities-repository'

export class DrizzleFacilitiesRepository implements FacilitiesRepository {
  async create(data: CreateFacilityInput) {
    const [facility] = await db.insert(facilities).values(data).returning()
    return facility
  }

  async findBySlugAndCompanyId(slug: string, companyId: string) {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.slug, slug), eq(facilities.companyId, companyId)))
      .limit(1)

    if (!facility) {
      return null
    }

    return facility
  }

  async findByIdAndCompanyId(id: string, companyId: string) {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, id), eq(facilities.companyId, companyId)))
      .limit(1)

    if (!facility) {
      return null
    }

    return facility
  }

  async countByCompanyId(companyId: string) {
    const [result] = await db
      .select({
        count: count(),
      })
      .from(facilities)
      .where(eq(facilities.companyId, companyId))

    return Number(result.count)
  }
}
