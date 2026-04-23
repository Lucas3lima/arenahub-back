import type {
  Companies,
  CompaniesRepository,
  CreateCompaniesInput,
} from '../companies-repository'

export class InMemoryCompaniesRepository implements CompaniesRepository {
  public items: Companies[] = []

  async create(data: CreateCompaniesInput) {
    const company: Companies = {
      id: data.id ?? crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    }

    this.items.push(company)
    return company
  }

  async findBySlug(slug: string) {
    const company = this.items.find((item) => item.slug === slug)
    return company ?? null
  }

  async findById(id: string) {
    const company = this.items.find((item) => item.id === id)
    return company ?? null
  }
}
