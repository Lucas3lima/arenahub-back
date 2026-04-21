import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { companyUsers } from '../../db/schema'
import type {
  CompanyUsersRepository,
  CreateCompanyUsersInput,
} from '../company-users-repository'

export class DrizzleCompanyUsersRepository implements CompanyUsersRepository {
  async findByCompanyId(id: string) {
    const [companyUser] = await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.companyId, id))
      .limit(1)

    return companyUser
  }

  async create(data: CreateCompanyUsersInput) {
    const [companyUser] = await db.insert(companyUsers).values(data).returning()
    return companyUser
  }

  async findByCompanyIdAndUserId(companyId: string, userId: string) {
    const [companyUser] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
        ),
      )
      .limit(1)

    if (!companyUser) {
      return null
    }

    return companyUser
  }

  async findByUserId(userId: string) {
    const [companyUser] = await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.userId, userId))
      .limit(1)

    if (!companyUser) {
      return null
    }

    return companyUser
  }
}
