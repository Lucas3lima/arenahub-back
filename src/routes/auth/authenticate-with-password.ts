import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { DrizzleUsersRepository } from '../../repositories/drizzle/drizzle-users-repository'
import { AuthenticateWithPassword } from '../../use-cases/authenticate-with-password'
import { env } from '../../env'
import { InvalidCredentialsError } from '../../_errors/invalid-credentials-error'

export const authenticateWithPasswordRoute: FastifyPluginAsyncZod = async (
  app,
) => {
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with password',
        body: z.object({
          email: z.email(),
          password: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      try {
        const usersRepository = new DrizzleUsersRepository()
        const authenticateWithPassword = new AuthenticateWithPassword(
          usersRepository,
        )

        const { user } = await authenticateWithPassword.execute({
          email,
          password,
        })

        const token = await reply.jwtSign(
          {
            sub: user.id,
          },
          {
            sign: { expiresIn: '2d' },
          },
        )

        reply
          .setCookie('token', token, {
            path: '/',
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 2, // 2 dias
          })
          .status(201)
          .send()

        return
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return reply.status(401).send({ message: err.message })
        }
      }
    },
  )
}
