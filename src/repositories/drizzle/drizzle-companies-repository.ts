import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { companies } from '../../db/schema'
import type {
  CompaniesRepository,
  CreateCompaniesInput,
  UpdateCompanySettingsInput,
} from '../companies-repository'

export class DrizzleCompaniesRepository implements CompaniesRepository {
  async create(data: CreateCompaniesInput) {
    const [company] = await db.insert(companies).values(data).returning()
    return company
  }

  async findById(id: string) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1)

    if (!company) {
      return null
    }

    return company
  }

  async findBySlug(slug: string) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1)

    if (!company) {
      return null
    }

    return company
  }

  async updateSettingsById(id: string, data: UpdateCompanySettingsInput) {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning()

    if (!company) {
      return null
    }

    return company
  }
}
