export class CompanyAlreadyExistsError extends Error {
  constructor() {
    super('Empresa já cadastrada.')
  }
}
