import { fastify } from 'fastify'

import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { env } from './env'
import { createAccountRoute } from './routes/auth/create-accounts'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import { authenticateWithPasswordRoute } from './routes/auth/authenticate-with-password'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, {
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
})

app.register(fastifyCookie, {
  secret: env.JWT_SECRET,
  hook: 'onRequest',
})

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'token',
    signed: false,
  },
})

app.register(fastifySwagger, {
  openapi: {
    info: { title: 'API', version: '1.0.0' },
  },
  transform: jsonSchemaTransform,
})

app.register(ScalarApiReference, {
  routePrefix: '/docs',
})

app.register(createAccountRoute)
app.register(authenticateWithPasswordRoute)

app.listen({ port: env.PORT, host: '0.0.0.0' }, () => {
  console.log('HTTP server running on http://localhost:3333 !')
  console.log('Docs available at http://localhost:3333/docs !')
})
