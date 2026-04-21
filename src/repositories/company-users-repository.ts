import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { companyUsers } from '../db/schema'

export type CompanyUsers = InferSelectModel<typeof companyUsers>
export type CreateCompanyUsersInput = InferInsertModel<typeof companyUsers>

export interface CompanyUsersRepository {
  create(data: CreateCompanyUsersInput): Promise<CompanyUsers>
  findByCompanyId(id: string): Promise<CompanyUsers | null>
  findByCompanyIdAndUserId(
    companyId: string,
    userId: string,
  ): Promise<CompanyUsers | null>
  findByUserId(userId: string): Promise<CompanyUsers | null>
}
