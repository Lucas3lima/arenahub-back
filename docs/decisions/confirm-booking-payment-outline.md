# ConfirmBookingPayment (outline)

## Contexto

Hoje existe criação de reservas `pending_payment` para reservas online com entrada obrigatória, mas ainda não existe um fluxo de confirmação de pagamento que finalize essa reserva para `confirmed`.

## Objetivo

Definir o desenho do futuro use case `ConfirmBookingPayment` para:

- confirmar pagamentos online de reservas `pending_payment`;
- atualizar estado financeiro e operacional da reserva;
- impedir confirmação de reserva expirada.

## Regras de Negócio

- Entrada:
  - `companyId`
  - `bookingId`
  - `paidAmountCents`
  - `externalPaymentId`
  - `paymentMethod` (esperado: `online`)
- Pré-condições:
  - reserva existe e pertence à company;
  - reserva está em `status = pending_payment`;
  - `paymentExpiresAt` não expirou;
  - pagamento ainda não foi confirmado (`paymentStatus = unpaid`).
- Decisão financeira:
  - se `paidAmountCents >= totalPriceCents` => `paymentStatus = paid`;
  - se `paidAmountCents > 0 && paidAmountCents < totalPriceCents` => `paymentStatus = partial`;
  - `paidAmountCents <= 0` => erro de validação.
- Transição de status:
  - ao confirmar pagamento válido: `status = confirmed`;
  - `paymentExpiresAt = null`;
  - preencher `paidAt`, `paymentMethod`, `externalPaymentId`.

## Erros esperados

- `BookingNotFoundError`
- `BookingPaymentExpiredError` (quando hold expirou)
- `BookingAlreadyPaidError` (idempotência/duplicidade)
- `InvalidPaymentAmountError`
- `InvalidBookingPaymentStateError` (status diferente de `pending_payment`)

## Pontos de implementação

- Novo use case em `src/use-cases/bookings/confirm-booking-payment.ts`.
- Nova rota webhook/callback ou endpoint interno em `src/routes/bookings`.
- Método de repositório para update atômico por `bookingId` + estado esperado.
- Testes unitários cobrindo:
  - confirmação total;
  - confirmação parcial;
  - tentativa após expiração;
  - tentativa em reserva já confirmada/cancelada/expirada.
