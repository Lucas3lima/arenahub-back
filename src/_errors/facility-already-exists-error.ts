export class FacilityAlreadyExistsError extends Error {
  constructor() {
    super('Já existe uma unidade com este nome para esta empresa.')
  }
}
