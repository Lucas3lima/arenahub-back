import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { GetCourtDetails } from '../../use-cases/get-court-details'
import { toCourtResponse } from '../../utils/court-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { courtResponseSchema } from './schemas'

export const getCourtDetailsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:companySlug/courts/:courtId',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['courts'],
        summary: 'Get court details',
        params: z.object({
          companySlug: z.string().min(1),
          courtId: z.string().min(1),
        }),
        response: {
          200: courtResponseSchema,
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, courtId } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new GetCourtDetails(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleFacilitiesRepository(),
          new DrizzleCourtsRepository(),
        )

        const { court } = await useCase.execute({
          companySlug,
          userId: user.sub,
          courtId,
        })

        return reply.status(200).send(toCourtResponse(court))
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError ||
          err instanceof FacilityNotFoundError ||
          err instanceof CourtNotFoundError
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
