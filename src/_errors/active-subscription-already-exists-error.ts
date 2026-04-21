export class ActiveSubscriptionAlreadyExistsError extends Error {
  constructor() {
    super('A empresa já possui uma assinatura ativa.')
  }
}
