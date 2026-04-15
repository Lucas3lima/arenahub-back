import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { UserAlreadyExistsError } from '../../_errors/user-already-exists-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleUsersRepository } from '../../repositories/drizzle/drizzle-users-repository'
import { CreateCompanies } from '../../use-cases/create-companies'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'

export const createCompaniesRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/companies',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['companies'],
        summary: 'Create a new company',
        body: z.object({
          name: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { name } = request.body
      const user = getAuthenticatedUser(request)

      try {
        const usersRepository = new DrizzleUsersRepository()
        const companiesRepository = new DrizzleCompaniesRepository()
        const companyUsersRepository = new DrizzleCompanyUsersRepository()
        const createCompanies = new CreateCompanies(
          usersRepository,
          companiesRepository,
          companyUsersRepository,
        )

        const { company, companyUser } = await createCompanies.execute({
          name,
          userId: user.sub,
        })

        return reply
          .status(201)
          .send({ companyId: company.id, companyUserId: companyUser.id })
      } catch (err) {
        if (err instanceof UserAlreadyExistsError) {
          return reply.status(400).send({ message: err.message })
        }
        throw err
      }
    },
  )
}
