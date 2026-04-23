import type {
  CompanyUsers,
  CompanyUsersRepository,
  CreateCompanyUsersInput,
} from '../company-users-repository'

export class InMemoryCompanyUsersRepository implements CompanyUsersRepository {
  public items: CompanyUsers[] = []

  async create(data: CreateCompanyUsersInput) {
    const companyUser: CompanyUsers = {
      id: data.id ?? crypto.randomUUID(),
      companyId: data.companyId,
      userId: data.userId,
      role: data.role ?? 'staff',
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    }

    this.items.push(companyUser)
    return companyUser
  }

  async findByCompanyId(id: string) {
    const companyUser = this.items.find((item) => item.companyId === id)
    return companyUser ?? null
  }

  async findByCompanyIdAndUserId(companyId: string, userId: string) {
    const companyUser = this.items.find(
      (item) => item.companyId === companyId && item.userId === userId,
    )

    return companyUser ?? null
  }

  async findByUserId(userId: string) {
    const companyUser = this.items.find((item) => item.userId === userId)
    return companyUser ?? null
  }
}
