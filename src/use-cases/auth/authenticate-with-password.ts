import { compare } from 'bcryptjs'
import { InvalidCredentialsError } from '../../_errors/invalid-credentials-error'
import type { UsersRepository } from '../../repositories/users-repository'

interface AuthenticateWithPasswordUseCaseRequest {
  email: string
  password: string
}

export class AuthenticateWithPassword {
  private usersRepository: UsersRepository

  constructor(usersRepository: UsersRepository) {
    this.usersRepository = usersRepository
  }

  async execute({ email, password }: AuthenticateWithPasswordUseCaseRequest) {
    const user = await this.usersRepository.findByEmail(email)

    if (!user) {
      throw new InvalidCredentialsError()
    }

    const isPasswordValid = await compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new InvalidCredentialsError()
    }

    return {
      user,
    }
  }
}
