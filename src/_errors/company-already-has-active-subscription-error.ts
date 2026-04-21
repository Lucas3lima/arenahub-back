export class CompanyAlreadyHasActiveSubscriptionError extends Error {
  constructor() {
    super('A empresa já possui uma assinatura ativa.')
  }
}
