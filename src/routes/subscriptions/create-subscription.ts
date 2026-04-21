import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { CompanyAlreadyHasActiveSubscriptionError } from '../../_errors/company-already-has-active-subscription-error'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { InvalidSubscriptionPeriodError } from '../../_errors/invalid-subscription-period-error'
import { PlanInactiveError } from '../../_errors/plan-inactive-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { TrialAlreadyUsedError } from '../../_errors/trial-already-used-error'
import { UnauthorizedCompanyAccessError } from '../../_errors/unauthorized-company-access-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { CreateSubscription } from '../../use-cases/create-subscription'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'

export const createSubscriptionRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/subscriptions',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['subscriptions'],
        summary: 'Create company subscription',
        body: z.object({
          companySlug: z.string().min(1),
          planSlug: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const { companySlug, planSlug } = request.body
      const user = getAuthenticatedUser(request)

      try {
        const companiesRepository = new DrizzleCompaniesRepository()
        const companyUsersRepository = new DrizzleCompanyUsersRepository()
        const plansRepository = new DrizzlePlansRepository()
        const subscriptionsRepository = new DrizzleSubscriptionsRepository()
        const createSubscription = new CreateSubscription(
          companiesRepository,
          companyUsersRepository,
          plansRepository,
          subscriptionsRepository,
        )

        const { subscription } = await createSubscription.execute({
          companySlug,
          userId: user.sub,
          planSlug,
        })

        return reply.status(201).send({
          subscriptionId: subscription.id,
          status: subscription.status,
          planId: subscription.planId,
          currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        })
      } catch (err) {
        if (
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        if (err instanceof UnauthorizedCompanyAccessError) {
          return reply.status(403).send({ message: err.message })
        }

        if (
          err instanceof TrialAlreadyUsedError ||
          err instanceof CompanyAlreadyHasActiveSubscriptionError
        ) {
          return reply.status(409).send({ message: err.message })
        }

        if (
          err instanceof PlanInactiveError ||
          err instanceof InvalidSubscriptionPeriodError
        ) {
          return reply.status(400).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
