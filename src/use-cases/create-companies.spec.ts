import { beforeEach, describe, expect, it } from 'vitest'
import { CompanyAlreadyExistsError } from '../_errors/company-already-exists-error'
import { CompanyUserAlreadyExistsError } from '../_errors/company-users-already-exists-error copy'
import { UserNotFoundError } from '../_errors/user-not-found-error'
import { InMemoryCompaniesRepository } from '../repositories/in-memory/in-memory-companies-repository'
import { InMemoryCompanyUsersRepository } from '../repositories/in-memory/in-memory-company-users-repository'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-memory-users-repository'
import { CreateCompanies } from './create-companies'

let inMemoryUsersRepository: InMemoryUsersRepository
let inMemoryCompaniesRepository: InMemoryCompaniesRepository
let inMemoryCompanyUsersRepository: InMemoryCompanyUsersRepository
let sut: CreateCompanies

describe('Create Companies', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()
    inMemoryCompaniesRepository = new InMemoryCompaniesRepository()
    inMemoryCompanyUsersRepository = new InMemoryCompanyUsersRepository()

    sut = new CreateCompanies(
      inMemoryUsersRepository,
      inMemoryCompaniesRepository,
      inMemoryCompanyUsersRepository,
    )
  })

  it('should be able to create a company and owner relation', async () => {
    const user = await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
    })

    const { company, companyUser } = await sut.execute({
      name: 'Arena Hub',
      userId: user.id,
    })

    expect(company.id).toBeDefined()
    expect(company.slug).toBe('arena-hub')
    expect(companyUser.companyId).toBe(company.id)
    expect(companyUser.role).toBe('owner')
  })

  it('should not be able to create a company with a non-existing user', async () => {
    await expect(
      sut.execute({
        name: 'Arena Hub',
        userId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })

  it('should not be able to create a second company for a user already linked to one', async () => {
    const user = await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
    })

    const company = await inMemoryCompaniesRepository.create({
      name: 'Arena Hub',
      slug: 'arena-hub',
    })

    await inMemoryCompanyUsersRepository.create({
      companyId: company.id,
      userId: user.id,
      role: 'owner',
    })

    await expect(
      sut.execute({
        name: 'Second Arena',
        userId: user.id,
      }),
    ).rejects.toBeInstanceOf(CompanyUserAlreadyExistsError)
  })

  it('should not be able to create a company with a duplicated slug', async () => {
    const userOne = await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'hashed-password',
    })

    const userTwo = await inMemoryUsersRepository.create({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      passwordHash: 'hashed-password',
    })

    await sut.execute({
      name: 'Arena Hub',
      userId: userOne.id,
    })

    await expect(
      sut.execute({
        name: 'Arena Hub',
        userId: userTwo.id,
      }),
    ).rejects.toBeInstanceOf(CompanyAlreadyExistsError)
  })
})
