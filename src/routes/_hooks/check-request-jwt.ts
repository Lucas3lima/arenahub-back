import type { FastifyReply, FastifyRequest } from 'fastify'

export async function checkRequestJWT(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const user = await request.jwtVerify<{
      sub: string
    }>({ onlyCookie: true })

    request.user = {
      sub: user.sub,
    }
  } catch {
    return reply.status(401).send({ message: 'Token inválido.' })
  }
}
