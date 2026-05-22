import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { FacilityAlreadyExistsError } from '../../_errors/facility-already-exists-error'
import { MaxFacilitiesReachedError } from '../../_errors/max-facilities-reached-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzleFacilitiesRepository } from '../../repositories/drizzle/drizzle-facilities-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CreateFacility } from '../../use-cases/facilities/create-facility'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'

export const createFacilityRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:companySlug/facilities',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['facilities'],
        summary: 'Create company facility',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        body: z.object({
          name: z.string().min(1),
          address: z.string().optional(),
          phone: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { companySlug } = request.params
      const { name, address, phone } = request.body
      const user = getAuthenticatedUser(request)

      try {
        const companiesRepository = new DrizzleCompaniesRepository()
        const companyUsersRepository = new DrizzleCompanyUsersRepository()
        const subscriptionsRepository = new DrizzleSubscriptionsRepository()
        const plansRepository = new DrizzlePlansRepository()
        const facilitiesRepository = new DrizzleFacilitiesRepository()
        const createFacility = new CreateFacility(
          companiesRepository,
          companyUsersRepository,
          subscriptionsRepository,
          plansRepository,
          facilitiesRepository,
        )

        const { facility } = await createFacility.execute({
          companySlug,
          userId: user.sub,
          name,
          address,
          phone,
        })

        return reply.status(201).send({
          facilityId: facility.id,
          companyId: facility.companyId,
          name: facility.name,
          slug: facility.slug,
          address: facility.address,
          phone: facility.phone,
        })
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        if (
          err instanceof UnauthorizedCompanyAccessError ||
          err instanceof ActiveSubscriptionRequiredError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (err instanceof MaxFacilitiesReachedError) {
          return reply.status(400).send({ message: err.message })
        }

        if (err instanceof FacilityAlreadyExistsError) {
          return reply.status(409).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
