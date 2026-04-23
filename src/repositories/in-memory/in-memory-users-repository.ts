import type {
  CreateUserInput,
  Users,
  UsersRepository,
} from '../users-repository'

export class InMemoryUsersRepository implements UsersRepository {
  private items: Users[] = []

  async create(data: CreateUserInput) {
    const user = {
      id: data.id ?? crypto.randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    }
    this.items.push(user)
    return user
  }

  async findByEmail(email: string) {
    const user = this.items.find((user) => user.email === email)
    return user ?? null
  }
  async findById(id: string) {
    const user = this.items.find((user) => user.id === id)
    return user ?? null
  }
}
