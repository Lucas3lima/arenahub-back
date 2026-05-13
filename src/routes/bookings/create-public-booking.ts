import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { BookingSlotUnavailableError } from '../../_errors/booking-slot-unavailable-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { CourtUnavailableError } from '../../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidBookingTimeRangeError } from '../../_errors/invalid-booking-time-range-error'
import { OnlineReservationsNotAvailableError } from '../../_errors/online-reservations-not-available-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CreatePublicBooking } from '../../use-cases/create-public-booking'
import { GetPublicBookingDetails } from '../../use-cases/get-public-booking-details'
import { toBookingResponse } from '../../utils/booking-presentation'
import { bookingResponseSchema } from './schemas'

export const createPublicBookingRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/public/:companySlug/bookings',
    {
      schema: {
        tags: ['bookings'],
        summary: 'Create public booking',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        body: z.object({
          facilitySlug: z.string().min(1),
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
            paymentMode: z.enum(['counter_only', 'online_or_counter']),
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

      try {
        const createUseCase = new CreatePublicBooking(
          new DrizzleCompaniesRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleFacilitiesRepository(),
          new DrizzleCourtsRepository(),
          new DrizzleBookingsRepository(),
        )
        const detailsUseCase = new GetPublicBookingDetails(
          new DrizzleCompaniesRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleBookingsRepository(),
        )

        const { booking, paymentMode } = await createUseCase.execute({
          companySlug,
          facilitySlug: request.body.facilitySlug,
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
          bookingId: booking.id,
        })

        return reply.status(201).send({
          booking: toBookingResponse(bookingWithContext),
          paymentMode,
        })
      } catch (err) {
        if (
          err instanceof InvalidBookingTimeRangeError ||
          err instanceof CourtUnavailableError
        ) {
          return reply.status(400).send({ message: err.message })
        }

        if (
          err instanceof ActiveSubscriptionRequiredError ||
          err instanceof OnlineReservationsNotAvailableError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (
          err instanceof CompanyNotFoundError ||
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
