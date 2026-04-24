export class FacilityNotFoundError extends Error {
  constructor() {
    super('Unidade não encontrada.')
  }
}
