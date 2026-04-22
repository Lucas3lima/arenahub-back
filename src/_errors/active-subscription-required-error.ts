export class ActiveSubscriptionRequiredError extends Error {
  constructor() {
    super('A empresa precisa de uma assinatura ativa para criar unidades.')
  }
}
