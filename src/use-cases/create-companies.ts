import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { UsersRepository } from '../repositories/users-repository'
import { createSlug } from '../utils/create-slug'

interface CreateCompaniesUseCaseRequest {
  name: string
  userId: string
}

export class CreateCompanies {
  private usersRepository: UsersRepository
  private companiesRepository: CompaniesRepository
  private companyUsersRepository: CompanyUsersRepository
  constructor(
    usersRepository: UsersRepository,
    companiesRepository: CompaniesRepository,
    companyUsersRepository: CompanyUsersRepository,
  ) {
    this.usersRepository = usersRepository
    this.companiesRepository = companiesRepository
    this.companyUsersRepository = companyUsersRepository
  }

  async execute({ name, userId }: CreateCompaniesUseCaseRequest) {
    const userExists = await this.usersRepository.findById(userId)

    if (!userExists) {
      throw new Error('User not found')
    }

    const slug = createSlug(name)

    const companyExists = await this.companiesRepository.findBySlug(slug)

    if (companyExists) {
      throw new Error('Company already exists')
    }

    const company = await this.companiesRepository.create({
      name,
      slug,
    })

    const companyUser = await this.companyUsersRepository.create({
      companyId: company.id,
      userId,
      role: 'owner',
    })

    return {
      company,
      companyUser,
    }
  }
}
