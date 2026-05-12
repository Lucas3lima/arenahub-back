export class OnlineReservationsNotAvailableError extends Error {
  constructor() {
    super('Reservas online não estão disponíveis para o plano atual.')
  }
}
