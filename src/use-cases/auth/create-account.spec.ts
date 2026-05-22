import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryUsersRepository } from '../../repositories/in-memory/in-memory-users-repository'
import { CreateAccountUseCase } from './create-account'
import { compare } from 'bcryptjs'
import { UserAlreadyExistsError } from '../../_errors/user-already-exists-error'

let inMemoryUsersRepository: InMemoryUsersRepository
let sut: CreateAccountUseCase
describe('Create Account', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()
    sut = new CreateAccountUseCase(inMemoryUsersRepository)
  })

  it('should be able to create a new account', async () => {
    const { user } = await sut.execute({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '123456',
    })

    const isPasswordCorrectlyHashed = await compare('123456', user.passwordHash)

    expect(isPasswordCorrectlyHashed).toBe(true)
  })

  it('should not be able to create a new account with same email twice', async () => {
    await sut.execute({
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: '123456',
    })

    await expect(
      sut.execute({
        name: 'John Doe',
        email: 'john.doe@example.com', // same email
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError)
  })
})
