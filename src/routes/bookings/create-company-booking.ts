import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { BookingSlotUnavailableError } from '../../_errors/booking-slot-unavailable-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { CourtUnavailableError } from '../../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidBookingTimeRangeError } from '../../_errors/invalid-booking-time-range-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CreateCompanyBooking } from '../../use-cases/bookings/create-company-booking'
import { GetCompanyBookingDetails } from '../../use-cases/bookings/get-company-booking-details'
import { toBookingResponse } from '../../utils/booking-presentation'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { bookingResponseSchema } from './schemas'

export const createCompanyBookingRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:companySlug/bookings',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['bookings'],
        summary: 'Create company booking (staff/admin/owner)',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        body: z.object({
          courtId: z.uuid(),
          customerName: z.string().min(1),
          customerPhone: z.string().min(6),
          customerEmail: z.email().optional(),
          customerDocument: z.string().optional(),
          startsAt: z.string().datetime(),
          notes: z.string().max(500).optional(),
        }),
        response: {
          201: z.object({
            booking: bookingResponseSchema,
          }),
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const createUseCase = new CreateCompanyBooking(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleCourtsRepository(),
          new DrizzleFacilitiesRepository(),
          new DrizzleBookingsRepository(),
        )
        const detailsUseCase = new GetCompanyBookingDetails(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )

        const { booking } = await createUseCase.execute({
          companySlug,
          userId: user.sub,
          courtId: request.body.courtId,
          customerName: request.body.customerName,
          customerPhone: request.body.customerPhone,
          customerEmail: request.body.customerEmail,
          customerDocument: request.body.customerDocument,
          startsAt: new Date(request.body.startsAt),
          notes: request.body.notes,
        })

        const { booking: bookingWithContext } = await detailsUseCase.execute({
          companySlug,
          userId: user.sub,
          bookingId: booking.id,
        })

        return reply.status(201).send({
          booking: toBookingResponse(bookingWithContext),
        })
      } catch (err) {
        if (
          err instanceof InvalidBookingTimeRangeError ||
          err instanceof CourtUnavailableError
        ) {
          return reply.status(400).send({ message: err.message })
        }

        if (
          err instanceof UnauthorizedCompanyAccessError ||
          err instanceof ActiveSubscriptionRequiredError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError ||
          err instanceof FacilityNotFoundError ||
          err instanceof CourtNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        if (err instanceof BookingSlotUnavailableError) {
          return reply.status(409).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
