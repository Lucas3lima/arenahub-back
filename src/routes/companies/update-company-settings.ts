import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { ActiveSubscriptionRequiredError } from '../../_errors/active-subscription-required-error'
import { CompanyFeatureNotAllowedByPlanError } from '../../_errors/company-feature-not-allowed-by-plan-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { InvalidCompanySettingsError } from '../../_errors/invalid-company-settings-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { UpdateCompanySettings } from '../../use-cases/companies/update-company-settings'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'
import { companySettingsResponseSchema } from './schemas'

export const updateCompanySettingsRoute: FastifyPluginAsyncZod = async (
  app,
) => {
  app.patch(
    '/:companySlug/settings',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['companies'],
        summary: 'Update company feature settings',
        params: z.object({
          companySlug: z.string().min(1),
        }),
        body: z.object({
          onlineReservationsEnabled: z.boolean().optional(),
          onlinePaymentEnabled: z.boolean().optional(),
          onlineBookingRequiresDeposit: z.boolean().optional(),
          onlineBookingDepositPercent: z.int().min(0).max(100).optional(),
        }),
        response: {
          200: companySettingsResponseSchema,
          400: z.object({ message: z.string() }),
          403: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { companySlug } = request.params
      const user = getAuthenticatedUser(request)

      try {
        const useCase = new UpdateCompanySettings(
          new DrizzleCompaniesRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
        )

        const result = await useCase.execute({
          companySlug,
          userId: user.sub,
          ...request.body,
        })

        return reply.status(200).send({
          companyId: result.company.id,
          companySlug: result.company.slug,
          plan: result.plan,
          settings: result.settings,
          effective: result.effective,
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
          err instanceof ActiveSubscriptionRequiredError ||
          err instanceof CompanyFeatureNotAllowedByPlanError
        ) {
          return reply.status(403).send({ message: err.message })
        }

        if (err instanceof InvalidCompanySettingsError) {
          return reply.status(400).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
