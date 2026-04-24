import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { ListFacilityCourts } from '../../use-cases/list-facility-courts'
import { toCourtResponse } from '../../utils/court-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { courtResponseSchema } from './schemas'

export const listFacilityCourtsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:companySlug/facilities/:facilitySlug/courts',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['courts'],
        summary: 'List facility courts',
        params: z.object({
          companySlug: z.string().min(1),
          facilitySlug: z.string().min(1),
        }),
        response: {
          200: z.object({
            courts: z.array(courtResponseSchema),
          }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, facilitySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new ListFacilityCourts(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleFacilitiesRepository(),
          new DrizzleCourtsRepository(),
        )

        const { courts } = await useCase.execute({
          companySlug,
          userId: user.sub,
          facilitySlug,
        })

        return reply.status(200).send({
          courts: courts.map(toCourtResponse),
        })
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError ||
          err instanceof FacilityNotFoundError
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
