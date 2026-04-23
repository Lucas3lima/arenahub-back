import type {
  CreateFacilityInput,
  FacilitiesRepository,
  Facility,
} from '../facilities-repository'

export class InMemoryFacilitiesRepository implements FacilitiesRepository {
  public items: Facility[] = []

  async create(data: CreateFacilityInput) {
    const facility: Facility = {
      id: data.id ?? crypto.randomUUID(),
      companyId: data.companyId,
      name: data.name,
      slug: data.slug,
      address: data.address ?? null,
      phone: data.phone ?? null,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    }

    this.items.push(facility)
    return facility
  }

  async countByCompanyId(companyId: string) {
    return this.items.filter((item) => item.companyId === companyId).length
  }

  async findBySlugAndCompanyId(slug: string, companyId: string) {
    const facility = this.items.find(
      (item) => item.slug === slug && item.companyId === companyId,
    )

    return facility ?? null
  }
}
