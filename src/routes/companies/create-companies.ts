import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { UserAlreadyExistsError } from '../../_errors/user-already-exists-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleUsersRepository } from '../../repositories/drizzle/drizzle-users-repository'
import { CreateCompanies } from '../../use-cases/create-companies'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { CompanyUserAlreadyExistsError } from '../../_errors/company-users-already-exists-error copy'
import { CompanyAlreadyExistsError } from '../../_errors/company-already-exists-error'
import { UserNotFoundError } from '../../_errors/user-not-found-error'

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
        response: {
          201: z.object({
            companyId: z.string(),
            companyUserId: z.string(),
          }),
          409: z.object({
            message: z.string(),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
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
          return reply.status(409).send({ message: err.message })
        }
        if (err instanceof CompanyUserAlreadyExistsError) {
          return reply.status(409).send({ message: err.message })
        }
        if (err instanceof CompanyAlreadyExistsError) {
          return reply.status(409).send({ message: err.message })
        }
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ message: err.message })
        }
        throw err
      }
    },
  )
}
