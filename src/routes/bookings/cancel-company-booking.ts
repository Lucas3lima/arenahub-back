import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { BookingNotFoundError } from '../../_errors/booking-not-found-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CancelCompanyBooking } from '../../use-cases/bookings/cancel-company-booking'
import { GetCompanyBookingDetails } from '../../use-cases/bookings/get-company-booking-details'
import { toBookingResponse } from '../../utils/booking-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { bookingResponseSchema } from './schemas'

export const cancelCompanyBookingRoute: FastifyPluginAsyncZod = async (app) => {
  app.patch(
    '/:companySlug/bookings/:bookingId/cancel',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['bookings'],
        summary: 'Cancel company booking',
        params: z.object({
          companySlug: z.string().min(1),
          bookingId: z.uuid(),
        }),
        body: z.object({
          reason: z.string().max(500).optional(),
        }),
        response: {
          200: z.object({ booking: bookingResponseSchema }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, bookingId } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const cancelUseCase = new CancelCompanyBooking(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )
        const detailsUseCase = new GetCompanyBookingDetails(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )

        await cancelUseCase.execute({
          companySlug,
          userId: user.sub,
          bookingId,
          reason: request.body.reason,
        })

        const { booking } = await detailsUseCase.execute({
          companySlug,
          userId: user.sub,
          bookingId,
        })

        return reply.status(200).send({
          booking: toBookingResponse(booking),
        })
      } catch (err) {
        if (
          err instanceof UnauthorizedCompanyAccessError ||
          err instanceof ActiveSubscriptionRequiredError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError ||
          err instanceof BookingNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
