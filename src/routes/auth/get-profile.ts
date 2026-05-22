import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import z from 'zod'
import { CompanyNotFoundError } from '../../_errors/company-not-found-error'
import { PlanNotFoundError } from '../../_errors/plan-not-found-error'
import { UserNotFoundError } from '../../_errors/user-not-found-error'
import { DrizzleCompaniesRepository } from '../../repositories/drizzle/drizzle-companies-repository'
import { DrizzleCompanyUsersRepository } from '../../repositories/drizzle/drizzle-company-users-repository'
import { DrizzlePlansRepository } from '../../repositories/drizzle/drizzle-plans-repository'
import { DrizzleSubscriptionsRepository } from '../../repositories/drizzle/drizzle-subscriptions-repository'
import { DrizzleUsersRepository } from '../../repositories/drizzle/drizzle-users-repository'
import { GetProfile } from '../../use-cases/auth/get-profile'
import { getAuthenticatedUser } from '../../utils/get-authenticate-user'
import { checkRequestJWT } from '../_hooks/check-request-jwt'

export const getProfileRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/auth/profile',
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ['auth'],
        summary: 'Get authenticated user profile',
        response: {
          200: z.object({
            user: z.object({
              id: z.string(),
              name: z.string(),
              email: z.email(),
              createdAt: z.date(),
            }),
            company: z
              .object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                isActive: z.boolean(),
                role: z.enum(['owner', 'admin', 'staff']),
              })
              .nullable(),
            subscription: z
              .object({
                id: z.string(),
                status: z.enum([
                  'trialing',
                  'active',
                  'past_due',
                  'cancelled',
                  'expired',
                ]),
                currentPeriodEndsAt: z.date(),
                trialEndsAt: z.date().nullable(),
                plan: z.object({
                  slug: z.string(),
                  name: z.string(),
                }),
              })
              .nullable(),
            onboarding: z.object({
              hasCompany: z.boolean(),
              hasActiveSubscription: z.boolean(),
              canManageBilling: z.boolean(),
              canManageCompanySettings: z.boolean(),
            }),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = getAuthenticatedUser(request)

      try {
        const getProfile = new GetProfile(
          new DrizzleUsersRepository(),
          new DrizzleCompanyUsersRepository(),
          new DrizzleCompaniesRepository(),
          new DrizzleSubscriptionsRepository(),
          new DrizzlePlansRepository(),
        )

        const profile = await getProfile.execute({
          userId: user.sub,
        })

        return reply.status(200).send(profile)
      } catch (err) {
        if (
          err instanceof UserNotFoundError ||
          err instanceof CompanyNotFoundError ||
          err instanceof PlanNotFoundError
        ) {
          return reply.status(404).send({ message: err.message })
        }

        throw err
      }
    },
  )
}
