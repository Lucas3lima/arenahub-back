import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidCourtConfigurationError } from '../../_errors/invalid-court-configuration-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { UpdateCourt } from '../../use-cases/update-court'
import { toCourtResponse } from '../../utils/court-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import {
  courtResponseSchema,
  courtStatusSchema,
  openingHoursGroupSchema,
  sportTypeSchema,
  weekdayPriceSchema,
} from './schemas'

export const updateCourtRoute: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/:companySlug/courts/:courtId',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['courts'],
        summary: 'Update court configuration',
        params: z.object({
          companySlug: z.string().min(1),
          courtId: z.string().min(1),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          sportType: sportTypeSchema.optional(),
          status: courtStatusSchema.optional(),
          basePriceCents: z.int().min(0).optional(),
          rentalDurationMinutes: z.int().min(1).optional(),
          bufferMinutes: z.int().min(0).optional(),
          isActive: z.boolean().optional(),
          openingHours: z.array(openingHoursGroupSchema).min(1),
          weekdayPrices: z.array(weekdayPriceSchema).optional(),
        }),
        response: {
          200: courtResponseSchema,
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, courtId } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new UpdateCourt(
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
          ...request.body,
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

        if (err instanceof InvalidCourtConfigurationError) {
          return reply.status(400).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
