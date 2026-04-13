import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { users } from '../db/schema'

export type Users = InferSelectModel<typeof users>
export type CreateUserInput = InferInsertModel<typeof users>

export interface UsersRepository {
  create(data: CreateUserInput): Promise<Users>
  findByEmail(email: string): Promise<Users | null>
  findById(id: string): Promise<Users | null>
}
