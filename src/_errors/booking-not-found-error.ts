export class BookingNotFoundError extends Error {
  constructor() {
    super('Reserva não encontrada.')
  }
}
