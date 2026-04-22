import { MaxFacilitiesReachedError } from '../_errors/max-facilities-reached-error'
import type { CompaniesRepository } from '../repositories/companies-repository'
import type { CompanyUsersRepository } from '../repositories/company-users-repository'
import type { FacilitiesRepository } from '../repositories/facilities-repository'
import type { PlansRepository } from '../repositories/plans-repository'
import type { SubscriptionsRepository } from '../repositories/subscriptions-repository'
import { ensureCompanyContext } from './_guards/ensure-company-context'

interface CreateFacilityUseCaseRequest {
  companySlug: string
  userId: string
  name: string
  address?: string | null
  phone?: string | null
}

export class CreateFacility {
  private companiesRepository: CompaniesRepository
  private companyUsersRepository: CompanyUsersRepository
  private subscriptionsRepository: SubscriptionsRepository
  private plansRepository: PlansRepository
  private facilitiesRepository: FacilitiesRepository

  constructor(
    companiesRepository: CompaniesRepository,
    companyUsersRepository: CompanyUsersRepository,
    subscriptionsRepository: SubscriptionsRepository,
    plansRepository: PlansRepository,
    facilitiesRepository: FacilitiesRepository,
  ) {
    this.companiesRepository = companiesRepository
    this.companyUsersRepository = companyUsersRepository
    this.subscriptionsRepository = subscriptionsRepository
    this.plansRepository = plansRepository
    this.facilitiesRepository = facilitiesRepository
  }

  async execute({
    companySlug,
    userId,
    name,
    address,
    phone,
  }: CreateFacilityUseCaseRequest) {
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

    const facilitiesCount = await this.facilitiesRepository.countByCompanyId(
      company.id,
    )

    if (plan.maxFacilities !== -1 && facilitiesCount >= plan.maxFacilities) {
      throw new MaxFacilitiesReachedError()
    }

    const facility = await this.facilitiesRepository.create({
      companyId: company.id,
      name,
      address: address ?? null,
      phone: phone ?? null,
    })

    return {
      facility,
    }
  }
}
