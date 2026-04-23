import { hash } from 'bcryptjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidCredentialsError } from '../_errors/invalid-credentials-error'
import { InMemoryUsersRepository } from '../repositories/in-memory/in-memory-users-repository'
import { AuthenticateWithPassword } from './authenticate-with-password'

let inMemoryUsersRepository: InMemoryUsersRepository
let sut: AuthenticateWithPassword

describe('Authenticate With Password', () => {
  beforeEach(() => {
    inMemoryUsersRepository = new InMemoryUsersRepository()
    sut = new AuthenticateWithPassword(inMemoryUsersRepository)
  })

  it('should be able to authenticate with valid credentials', async () => {
    const passwordHash = await hash('123456', 6)

    const createdUser = await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash,
    })

    const { user } = await sut.execute({
      email: 'john.doe@example.com',
      password: '123456',
    })

    expect(user.id).toBe(createdUser.id)
  })

  it('should not be able to authenticate with a non-existing email', async () => {
    await expect(
      sut.execute({
        email: 'john.doe@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('should not be able to authenticate with an invalid password', async () => {
    const passwordHash = await hash('123456', 6)

    await inMemoryUsersRepository.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      passwordHash,
    })

    await expect(
      sut.execute({
        email: 'john.doe@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })
})
