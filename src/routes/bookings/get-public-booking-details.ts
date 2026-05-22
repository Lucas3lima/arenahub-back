import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { BookingNotFoundError } from '../../_errors/booking-not-found-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { OnlineReservationsNotAvailableError } from '../../_errors/online-reservations-not-available-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { GetPublicBookingDetails } from '../../use-cases/bookings/get-public-booking-details'
import { toBookingResponse } from '../../utils/booking-presentation'
import { bookingResponseSchema } from './schemas'

export const getPublicBookingDetailsRoute: FastifyPluginAsyncZod = async (
  app,
) => {
  app.get(
    '/public/:companySlug/bookings/:bookingId',
    {
      schema: {
        tags: ['bookings'],
        summary: 'Get public booking details',
        params: z.object({
          companySlug: z.string().min(1),
          bookingId: z.string().min(1),
        }),
        response: {
          200: z.object({
            booking: bookingResponseSchema,
            canPayOnline: z.boolean(),
            requiresOnlineDeposit: z.boolean(),
            depositPercent: z.int().min(0).max(100),
            depositAmountCents: z.int().min(0),
          }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, bookingId } = request.params

      try {
        const useCase = new GetPublicBookingDetails(
          new DrizzleCompaniesRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )

        const {
          booking,
          canPayOnline,
          requiresOnlineDeposit,
          depositPercent,
          depositAmountCents,
        } = await useCase.execute({
          companySlug,
          bookingId,
        })

        return reply.status(200).send({
          booking: toBookingResponse(booking),
          canPayOnline,
          requiresOnlineDeposit,
          depositPercent,
          depositAmountCents,
        })
      } catch (err) {
        if (err instanceof BookingNotFoundError || err instanceof CompanyNotFoundError) {
          return reply.status(404).send({ message: err.message })
        }

        if (
          err instanceof ActiveSubscriptionRequiredError ||
          err instanceof OnlineReservationsNotAvailableError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
