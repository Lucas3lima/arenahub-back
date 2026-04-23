import type { Plans, PlansRepository } from '../plans-repository'

export class InMemoryPlansRepository implements PlansRepository {
  public items: Plans[]

  constructor(items: Plans[] = []) {
    this.items = items
  }

  async findBySlug(slug: string) {
    const plan = this.items.find((item) => item.slug === slug)
    return plan ?? null
  }

  async findById(id: string) {
    const plan = this.items.find((item) => item.id === id)
    return plan ?? null
  }
}
