import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { UserAlreadyExistsError } from '../../_errors/user-already-exists-error'
import { DrizzleUsersRepository } from '../../repositories/drizzle/drizzle-users-repository'
import { CreateAccountUseCase } from '../../use-cases/create-account'

export const createAccountRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/accounts',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create a new account',
        body: z.object({
          name: z.string(),
          email: z.email(),
          password: z.string().min(4),
        }),
        response: {
          201: z.object({
            user: z.string(),
          }),
          400: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body

      try {
        const usersRepository = new DrizzleUsersRepository()
        const createAccount = new CreateAccountUseCase(usersRepository)

        const { user } = await createAccount.execute({ name, email, password })

        return reply.status(201).send({ user: user.id })
      } catch (err) {
        if (err instanceof UserAlreadyExistsError) {
          return reply.status(400).send({ message: err.message })
        }
        throw err
      }
    },
  )
}
