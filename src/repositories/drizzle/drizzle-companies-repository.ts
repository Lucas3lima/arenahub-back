import { db } from '../../db'
import { companies } from '../../db/schema'
import type {
  CompaniesRepository,
  CreateCompaniesInput,
} from '../companies-repository'

export class DrizzleCompaniesRepository implements CompaniesRepository {
  async create(data: CreateCompaniesInput) {
    const [company] = await db.insert(companies).values(data).returning()
    return company
  }
}
