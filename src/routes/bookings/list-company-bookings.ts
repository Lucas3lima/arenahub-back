import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { ListCompanyBookings } from '../../use-cases/bookings/list-company-bookings'
import { toBookingResponse } from '../../utils/booking-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import {
  bookingResponseSchema,
  bookingStatusSchema,
  paymentStatusSchema,
} from './schemas'

export const listCompanyBookingsRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:companySlug/bookings',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['bookings'],
        summary: 'List company bookings',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        querystring: z.object({
          startsAt: z.string().datetime(),
          endsAt: z.string().datetime(),
          courtId: z.string().optional(),
          status: bookingStatusSchema.optional(),
          paymentStatus: paymentStatusSchema.optional(),
          paymentDue: z.enum(['outstanding']).optional(),
        }),
        response: {
          200: z.object({
            bookings: z.array(bookingResponseSchema),
          }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new ListCompanyBookings(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )

        const { bookings } = await useCase.execute({
          companySlug,
          userId: user.sub,
          startsAt: new Date(request.query.startsAt),
          endsAt: new Date(request.query.endsAt),
          courtId: request.query.courtId,
          status: request.query.status,
          paymentStatus: request.query.paymentStatus,
          paymentDue: request.query.paymentDue,
        })

        return reply.status(200).send({
          bookings: bookings.map(toBookingResponse),
        })
      } catch (err) {
        if (
          err instanceof UnauthorizedCompanyAccessError ||
          err instanceof ActiveSubscriptionRequiredError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (err instanceof CompanyNotFoundError || err instanceof PlanNotFoundError) {
          return reply.status(404).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
