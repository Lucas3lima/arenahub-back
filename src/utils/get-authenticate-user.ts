import type { FastifyRequest } from 'fastify'

export function getAuthenticatedUser(request: FastifyRequest): { sub: string } {
  const user = request.user

  if (!user) {
    throw new Error('Invalid authentication do GetAuthenticatedUser')
  }

  return user
}
