export class CourtNotFoundError extends Error {
  constructor() {
    super('Quadra não encontrada.')
  }
}
