export class InvalidBookingTimeRangeError extends Error {
  constructor(message = 'Horário da reserva é inválido.') {
    super(message)
  }
}
