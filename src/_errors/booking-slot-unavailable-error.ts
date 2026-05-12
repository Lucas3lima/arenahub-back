export class BookingSlotUnavailableError extends Error {
  constructor() {
    super('Horário indisponível para esta quadra.')
  }
}
