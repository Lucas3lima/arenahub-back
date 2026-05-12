export class CourtUnavailableError extends Error {
  constructor() {
    super('Quadra indisponível para reserva no momento.')
  }
}
