import { CompanyAlreadyExistsError } from '../../_errors/company-already-exists-error'
import { CompanyUserAlreadyExistsError } from '../../_errors/company-users-already-exists-error copy'
import { UserNotFoundError } from '../../_errors/user-not-found-error'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { CompanyUsersRepository } from '../../repositories/company-users-repository'
import type { UsersRepository } from '../../repositories/users-repository'
import { createSlug } from '../../utils/create-slug'

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
      throw new UserNotFoundError()
    }

    const companyUserExists = await this.companyUsersRepository.findByUserId(
      userExists.id,
    )

    if (companyUserExists) {
      throw new CompanyUserAlreadyExistsError()
    }

    const slug = createSlug(name)

    const companyExists = await this.companiesRepository.findBySlug(slug)

    if (companyExists) {
      throw new CompanyAlreadyExistsError()
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
