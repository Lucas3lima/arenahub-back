import { FacilityNotFoundError } from '../_errors/facility-not-found-error'
import type { CourtsRepository } from '../repositories/courts-repository'
import type { FacilitiesRepository } from '../repositories/facilities-repository'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface ListFacilityCourtsUseCaseRequest {
  companySlug: string
  userId: string
  facilitySlug: string
}

export class ListFacilityCourts {
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
  }: ListFacilityCourtsUseCaseRequest) {
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

    const facility = await this.facilitiesRepository.findBySlugAndCompanyId(
      facilitySlug,
      company.id,
    )

    if (!facility) {
      throw new FacilityNotFoundError()
    }

    const courts = await this.courtsRepository.listByFacilityId(facility.id)

    return { courts }
  }
}
