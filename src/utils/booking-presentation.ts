import type { BookingWithContext } from '../repositories/bookings-repository'

export function toBookingResponse(data: BookingWithContext) {
  return {
    bookingId: data.booking.id,
    companyId: data.booking.companyId,
    courtId: data.booking.courtId,
    courtName: data.courtName,
    facilityName: data.facilityName,
    facilitySlug: data.facilitySlug,
    customerName: data.booking.customerName,
    customerPhone: data.booking.customerPhone,
    customerEmail: data.booking.customerEmail,
    customerDocument: data.booking.customerDocument,
    startsAt: data.booking.startsAt,
    endsAt: data.booking.endsAt,
    status: data.booking.status,
    source: data.booking.source,
    notes: data.booking.notes,
    totalPriceCents: data.booking.totalPriceCents,
    pricingRule: data.booking.pricingRule,
    paymentStatus: data.booking.paymentStatus,
    paymentMethod: data.booking.paymentMethod,
    paidAt: data.booking.paidAt,
    paymentExpiresAt: data.booking.paymentExpiresAt,
    externalPaymentId: data.booking.externalPaymentId,
    cancelledAt: data.booking.cancelledAt,
    cancelledByUserId: data.booking.cancelledByUserId,
    cancellationReason: data.booking.cancellationReason,
    createdAt: data.booking.createdAt,
    updatedAt: data.booking.updatedAt,
  }
}
