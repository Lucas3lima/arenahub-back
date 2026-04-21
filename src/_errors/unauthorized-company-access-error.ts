export class UnauthorizedCompanyAccessError extends Error {
  constructor() {
    super('Você não tem acesso a esta empresa.')
  }
}
