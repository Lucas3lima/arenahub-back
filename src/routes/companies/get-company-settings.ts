import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { GetCompanySettings } from '../../use-cases/companies/get-company-settings'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { companySettingsResponseSchema } from './schemas'

export const getCompanySettingsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:companySlug/settings',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['companies'],
        summary: 'Get company feature settings',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        response: {
          200: companySettingsResponseSchema,
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new GetCompanySettings(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
        )

        const result = await useCase.execute({
          companySlug,
          userId: user.sub,
        })

        return reply.status(200).send({
          companyId: result.company.id,
          companySlug: result.company.slug,
          plan: result.plan,
          settings: result.settings,
          effective: result.effective,
        })
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        if (
          err instanceof UnauthorizedCompanyAccessError ||
          err instanceof ActiveSubscriptionRequiredError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
