export class InvalidSubscriptionPeriodError extends Error {
  constructor() {
    super('Período de assinatura inválido.')
  }
}
