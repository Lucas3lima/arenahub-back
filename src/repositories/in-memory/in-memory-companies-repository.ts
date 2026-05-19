import type {
  Companies,
  CompaniesRepository,
  CreateCompaniesInput,
  UpdateCompanySettingsInput,
} from '../companies-repository'

export class InMemoryCompaniesRepository implements CompaniesRepository {
  public items: Companies[] = []

  async create(data: CreateCompaniesInput) {
    const company: Companies = {
      id: data.id ?? crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      isActive: data.isActive ?? true,
      onlineReservationsEnabled: data.onlineReservationsEnabled ?? true,
      onlinePaymentEnabled: data.onlinePaymentEnabled ?? true,
      onlineBookingRequiresDeposit: data.onlineBookingRequiresDeposit ?? false,
      onlineBookingDepositPercent: data.onlineBookingDepositPercent ?? 0,
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

  async updateSettingsById(id: string, data: UpdateCompanySettingsInput) {
    const index = this.items.findIndex((item) => item.id === id)
    if (index < 0) {
      return null
    }

    const current = this.items[index]
    const updated: Companies = {
      ...current,
      onlineReservationsEnabled:
        data.onlineReservationsEnabled ?? current.onlineReservationsEnabled,
      onlinePaymentEnabled:
        data.onlinePaymentEnabled ?? current.onlinePaymentEnabled,
      onlineBookingRequiresDeposit:
        data.onlineBookingRequiresDeposit ??
        current.onlineBookingRequiresDeposit,
      onlineBookingDepositPercent:
        data.onlineBookingDepositPercent ??
        current.onlineBookingDepositPercent,
      updatedAt: new Date(),
    }

    this.items[index] = updated
    return updated
  }
}
