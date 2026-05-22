import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidCourtConfigurationError } from '../../_errors/invalid-court-configuration-error'
import { MaxCourtsReachedError } from '../../_errors/max-courts-reached-error'
import type {
  CourtsRepository,
  CreateCourtInput,
} from '../../repositories/courts-repository'
import type { FacilitiesRepository } from '../../repositories/facilities-repository'
import type { CompaniesRepository } from '../../repositories/companies-repository'
import type { CompanyUsersRepository } from '../../repositories/company-users-repository'
import type { PlansRepository } from '../../repositories/plans-repository'
import type { SubscriptionsRepository } from '../../repositories/subscriptions-repository'
import { ensureCompanyContext } from '../_guards/ensure-company-context'
import {
  expandAndValidateOpeningHours,
  type CourtOpeningHoursGroup,
  type CourtWeekdayPriceInput,
  validateAndSortWeekdayPrices,
} from '../../utils/court-schedule'

interface CreateCourtUseCaseRequest {
  companySlug: string
  userId: string
  facilitySlug: string
  name: string
  description?: string | null
  sportType: CreateCourtInput['sportType']
  status?: CreateCourtInput['status']
  basePriceCents: number
  rentalDurationMinutes: number
  bufferMinutes?: number
  isActive?: boolean
  openingHours: CourtOpeningHoursGroup[]
  weekdayPrices?: CourtWeekdayPriceInput[]
}

export class CreateCourt {
  constructor(
    private companiesRepository: CompaniesRepository,
    private companyUsersRepository: CompanyUsersRepository,
    private subscriptionsRepository: SubscriptionsRepository,
    private plansRepository: PlansRepository,
    private facilitiesRepository: FacilitiesRepository,
    private courtsRepository: CourtsRepository,
  ) {}

  async execute({
    companySlug,
    userId,
    facilitySlug,
    name,
    description,
    sportType,
    status = 'open',
    basePriceCents,
    rentalDurationMinutes,
    bufferMinutes = 0,
    isActive = true,
    openingHours,
    weekdayPrices = [],
  }: CreateCourtUseCaseRequest) {
    const { company, plan } = await ensureCompanyContext({
      companySlug,
      userId,
      allowedRoles: ['owner', 'admin'],
      requireActiveSubscription: true,
      companiesRepository: this.companiesRepository,
      companyUsersRepository: this.companyUsersRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    validateCourtSettings({
      basePriceCents,
      rentalDurationMinutes,
      bufferMinutes,
    })

    const facility = await this.facilitiesRepository.findBySlugAndCompanyId(
      facilitySlug,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
    }

    const currentCourtsCount = await this.courtsRepository.countByCompanyId(
      company.id,
    )

    if (plan.maxCourts !== -1 && currentCourtsCount >= plan.maxCourts) {
      throw new MaxCourtsReachedError()
    }

    const normalizedOpeningHours = expandAndValidateOpeningHours(openingHours)
    const normalizedWeekdayPrices = validateAndSortWeekdayPrices(weekdayPrices)

    const court = await this.courtsRepository.create({
      court: {
        facilityId: facility.id,
        name,
        description: description ?? null,
        sportType,
        status,
        basePriceCents,
        rentalDurationMinutes,
        bufferMinutes,
        isActive,
      },
      openingHours: normalizedOpeningHours,
      weekdayPrices: normalizedWeekdayPrices,
    })

    return { court }
  }
}

function validateCourtSettings(data: {
  basePriceCents: number
  rentalDurationMinutes: number
  bufferMinutes: number
}) {
  if (!Number.isInteger(data.basePriceCents) || data.basePriceCents <= 0) {
    throw new InvalidCourtConfigurationError(
      'Preço base deve ser um inteiro maior a zero.',
    )
  }

  if (
    !Number.isInteger(data.rentalDurationMinutes) ||
    data.rentalDurationMinutes <= 0
  ) {
    throw new InvalidCourtConfigurationError(
      'Duração de aluguel deve ser um inteiro maior que zero.',
    )
  }

  if (!Number.isInteger(data.bufferMinutes) || data.bufferMinutes < 0) {
    throw new InvalidCourtConfigurationError(
      'Tempo de intervalo deve ser um inteiro maior ou igual a zero.',
    )
  }
}
