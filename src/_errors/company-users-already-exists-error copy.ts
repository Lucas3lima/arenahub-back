export class CompanyUserAlreadyExistsError extends Error {
  constructor() {
    super('Usuário já cadastrado em uma outra empresa.')
  }
}
