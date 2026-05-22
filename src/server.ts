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
import { getProfileRoute } from './routes/auth/get-profile'
import { createCompaniesRoute } from './routes/companies/create-companies'
import { getCompanySettingsRoute } from './routes/companies/get-company-settings'
import { updateCompanySettingsRoute } from './routes/companies/update-company-settings'
import { createSubscriptionRoute } from './routes/subscriptions/create-subscription'
import { createFacilityRoute } from './routes/facilities/create-facility'
import { createCourtRoute } from './routes/courts/create-court'
import { updateCourtRoute } from './routes/courts/update-court'
import { listFacilityCourtsRoute } from './routes/courts/list-facility-courts'
import { getCourtDetailsRoute } from './routes/courts/get-court-details'
import { getPublicCourtAvailabilityRoute } from './routes/bookings/get-public-court-availability'
import { createPublicBookingRoute } from './routes/bookings/create-public-booking'
import { getPublicBookingDetailsRoute } from './routes/bookings/get-public-booking-details'
import { createCompanyBookingRoute } from './routes/bookings/create-company-booking'
import { listCompanyBookingsRoute } from './routes/bookings/list-company-bookings'
import { cancelCompanyBookingRoute } from './routes/bookings/cancel-company-booking'

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
app.register(getProfileRoute)

//Companies
app.register(createCompaniesRoute)
app.register(getCompanySettingsRoute)
app.register(updateCompanySettingsRoute)

//Subscriptions
app.register(createSubscriptionRoute)

//Facilities
app.register(createFacilityRoute)

//Courts
app.register(createCourtRoute)
app.register(updateCourtRoute)
app.register(listFacilityCourtsRoute)
app.register(getCourtDetailsRoute)

//Bookings
app.register(getPublicCourtAvailabilityRoute)
app.register(createPublicBookingRoute)
app.register(getPublicBookingDetailsRoute)
app.register(createCompanyBookingRoute)
app.register(listCompanyBookingsRoute)
app.register(cancelCompanyBookingRoute)

app.listen({ port: env.PORT, host: '0.0.0.0' }, () => {
  console.log('HTTP server running on http://localhost:3333 !')
  console.log('Docs available at http://localhost:3333/docs !')
})
