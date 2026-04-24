import { CourtNotFoundError } from '../_errors/court-not-found-error'
import { FacilityNotFoundError } from '../_errors/facility-not-found-error'
import type { CourtsRepository } from '../repositories/courts-repository'
import type { FacilitiesRepository } from '../repositories/facilities-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface GetCourtDetailsUseCaseRequest {
  companySlug: string
  userId: string
  courtId: string
}

export class GetCourtDetails {
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
  }: GetCourtDetailsUseCaseRequest) {
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

    const court = await this.courtsRepository.findById(courtId)

    if (!court) {
      throw new CourtNotFoundError()
    }

    const facility = await this.facilitiesRepository.findByIdAndCompanyId(
      court.court.facilityId,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
    }

    return { court }
  }
}
