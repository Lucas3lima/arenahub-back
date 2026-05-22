import { CourtNotFoundError } from '../../_errors/court-not-found-error'
import { FacilityNotFoundError } from '../../_errors/facility-not-found-error'
import { InvalidCourtConfigurationError } from '../../_errors/invalid-court-configuration-error'
import type {
  CourtsRepository,
  UpdateCourtInput,
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

interface UpdateCourtUseCaseRequest {
  companySlug: string
  userId: string
  courtId: string
  name?: string
  description?: string | null
  sportType?: UpdateCourtInput['sportType']
  status?: UpdateCourtInput['status']
  basePriceCents?: number
  rentalDurationMinutes?: number
  bufferMinutes?: number
  isActive?: boolean
  openingHours: CourtOpeningHoursGroup[]
  weekdayPrices?: CourtWeekdayPriceInput[]
}

export class UpdateCourt {
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
    courtId,
    name,
    description,
    sportType,
    status,
    basePriceCents,
    rentalDurationMinutes,
    bufferMinutes,
    isActive,
    openingHours,
    weekdayPrices = [],
  }: UpdateCourtUseCaseRequest) {
    const { company } = await ensureCompanyContext({
      companySlug,
      userId,
      allowedRoles: ['owner', 'admin'],
      requireActiveSubscription: true,
      companiesRepository: this.companiesRepository,
      companyUsersRepository: this.companyUsersRepository,
      subscriptionsRepository: this.subscriptionsRepository,
      plansRepository: this.plansRepository,
    })

    const existingCourt = await this.courtsRepository.findById(courtId)

    if (!existingCourt) {
      throw new CourtNotFoundError()
    }

    const facility = await this.facilitiesRepository.findByIdAndCompanyId(
      existingCourt.court.facilityId,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
    }

    const nextBasePriceCents =
      basePriceCents ?? existingCourt.court.basePriceCents
    const nextDurationMinutes =
      rentalDurationMinutes ?? existingCourt.court.rentalDurationMinutes
    const nextBufferMinutes = bufferMinutes ?? existingCourt.court.bufferMinutes

    validateCourtSettings({
      basePriceCents: nextBasePriceCents,
      rentalDurationMinutes: nextDurationMinutes,
      bufferMinutes: nextBufferMinutes,
    })

    const normalizedOpeningHours = expandAndValidateOpeningHours(openingHours)
    const normalizedWeekdayPrices = validateAndSortWeekdayPrices(weekdayPrices)

    const court = await this.courtsRepository.updateById(courtId, {
      court: {
        name,
        description,
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

    if (!court) {
      throw new CourtNotFoundError()
    }

    return { court }
  }
}

function validateCourtSettings(data: {
  basePriceCents: number
  rentalDurationMinutes: number
  bufferMinutes: number
}) {
  if (!Number.isInteger(data.basePriceCents) || data.basePriceCents < 0) {
    throw new InvalidCourtConfigurationError(
      'Preço base deve ser um inteiro maior ou igual a zero.',
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
