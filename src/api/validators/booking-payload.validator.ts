/**
 * Lightweight runtime validation for booking payloads — used in negative
 * tests where we want to verify our own assumptions before sending bad data
 * to the API. Not a replacement for AJV/JSON Schema validation in the
 * contract tests; this is the "did I assemble the payload correctly" check.
 */
import type { CreateBookingPayload } from '../types/booking.types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Permissive on purpose — the goal is to catch obvious typos, not to implement RFC 5322.
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PayloadIssue {
  field: string;
  message: string;
}

export function validateBookingPayload(p: Partial<CreateBookingPayload>): PayloadIssue[] {
  const issues: PayloadIssue[] = [];

  if (!p.firstname || p.firstname.length < 1) {
    issues.push({ field: 'firstname', message: 'must be non-empty' });
  }
  if (!p.lastname || p.lastname.length < 1) {
    issues.push({ field: 'lastname', message: 'must be non-empty' });
  }
  if (p.email !== undefined && !EMAIL_OK.test(p.email)) {
    issues.push({ field: 'email', message: 'invalid email format' });
  }

  if (p.bookingdates) {
    if (!ISO_DATE.test(p.bookingdates.checkin)) {
      issues.push({ field: 'bookingdates.checkin', message: 'must be YYYY-MM-DD' });
    }
    if (!ISO_DATE.test(p.bookingdates.checkout)) {
      issues.push({ field: 'bookingdates.checkout', message: 'must be YYYY-MM-DD' });
    }
    if (p.bookingdates.checkin >= p.bookingdates.checkout) {
      issues.push({ field: 'bookingdates', message: 'checkin must be before checkout' });
    }
  }

  return issues;
}

export function isValidBookingPayload(p: Partial<CreateBookingPayload>): boolean {
  return validateBookingPayload(p).length === 0;
}
