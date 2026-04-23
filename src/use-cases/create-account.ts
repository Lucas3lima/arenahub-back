import { hash } from 'bcryptjs'
import { UserAlreadyExistsError } from '../_errors/user-already-exists-error'
import type { UsersRepository } from '../repositories/users-repository'

interface CreateAccountUseCaseRequest {
  name: string
  email: string
  password: string
}

export class CreateAccountUseCase {
  private usersRepository: UsersRepository
  constructor(usersRepository: UsersRepository) {
    this.usersRepository = usersRepository
  }

  async execute({ name, email, password }: CreateAccountUseCaseRequest) {
    const userWithSameEmail = await this.usersRepository.findByEmail(email)

    if (userWithSameEmail) {
      throw new UserAlreadyExistsError()
    }

    const passwordHash = await hash(password, 6)

    const user = await this.usersRepository.create({
      name,
      email,
      passwordHash,
    })

    return {
      user,
    }
  }
}
