import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import type { CreateUserInput, UsersRepository } from '../users-repository'

export class DrizzleUsersRepository implements UsersRepository {
  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    5
    return user
  }
  async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user
  }

  async create(data: CreateUserInput) {
    const [user] = await db.insert(users).values(data).returning()
    return user
  }
}
