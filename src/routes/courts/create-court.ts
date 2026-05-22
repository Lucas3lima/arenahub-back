import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidCourtConfigurationError } from '../../_errors/invalid-court-configuration-error'
import { MaxCourtsReachedError } from '../../_errors/max-courts-reached-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CreateCourt } from '../../use-cases/courts/create-court'
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

export const createCourtRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:companySlug/facilities/:facilitySlug/courts',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['courts'],
        summary: 'Create facility court',
        params: z.object({
          companySlug: z.string().min(1),
          facilitySlug: z.string().min(1),
        }),
        body: z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          sportType: sportTypeSchema,
          status: courtStatusSchema.optional(),
          basePriceCents: z.int().min(0),
          rentalDurationMinutes: z.int().min(1),
          bufferMinutes: z.int().min(0).optional(),
          isActive: z.boolean().optional(),
          openingHours: z.array(openingHoursGroupSchema).min(1),
          weekdayPrices: z.array(weekdayPriceSchema).optional(),
        }),
        response: {
          201: courtResponseSchema,
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, facilitySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new CreateCourt(
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
          facilitySlug,
          ...request.body,
        })

        return reply.status(201).send(toCourtResponse(court))
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

        if (
          err instanceof InvalidCourtConfigurationError ||
          err instanceof MaxCourtsReachedError
        ) {
          return reply.status(400).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
