import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { CourtUnavailableError } from '../../_errors/court-unavailable-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { OnlineReservationsNotAvailableError } from '../../_errors/online-reservations-not-available-error'
import { DrizzleBookingsRepository } from '../../repositories/drizzle/drizzle-bookings-repository'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCourtsRepository } from '../../repositories/drizzle/drizzle-courts-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { GetPublicCourtAvailability } from '../../use-cases/get-public-court-availability'
import { availabilitySlotSchema } from './schemas'

export const getPublicCourtAvailabilityRoute: FastifyPluginAsyncZod = async (
  app,
) => {
  app.get(
    '/public/:companySlug/facilities/:facilitySlug/courts/:courtId/availability',
    {
      schema: {
        tags: ['bookings'],
        summary: 'Get public court availability by date',
        params: z.object({
          companySlug: z.string().min(1),
          facilitySlug: z.string().min(1),
          courtId: z.uuid(),
        }),
        querystring: z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
        response: {
          200: z.object({
            courtId: z.string(),
            paymentMode: z.enum(['counter_only', 'online_or_counter']),
            requiresOnlineDeposit: z.boolean(),
            depositPercent: z.int().min(0).max(100),
            slots: z.array(availabilitySlotSchema),
          }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug, facilitySlug, courtId } = request.params
      const { date } = request.query

      try {
        const useCase = new GetPublicCourtAvailability(
          new DrizzleCompaniesRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
          new DrizzleFacilitiesRepository(),
          new DrizzleCourtsRepository(),
          new DrizzleBookingsRepository(),
        )

        const {
          court,
          slots,
          paymentMode,
          requiresOnlineDeposit,
          depositPercent,
        } = await useCase.execute({
          companySlug,
          facilitySlug,
          courtId,
          date,
        })

        return reply.status(200).send({
          courtId: court.id,
          paymentMode,
          requiresOnlineDeposit,
          depositPercent,
          slots,
        })
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof FacilityNotFoundError ||
          err instanceof CourtNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        if (
          err instanceof ActiveSubscriptionRequiredError ||
          err instanceof OnlineReservationsNotAvailableError ||
          err instanceof CourtUnavailableError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
