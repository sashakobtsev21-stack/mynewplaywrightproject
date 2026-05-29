import { z } from 'zod';
import type { AiKind } from './data-generator';

/**
 * Zod schemas for the records the data generator asks Claude to produce.
 *
 * Two tiers per kind:
 *  - `strict` — what we actually want (valid email, ISO dates, positive room id).
 *  - `loose`  — same shape, relaxed values. Used as a fallback when the model
 *    returns plausible-but-imperfect data so one odd phone number doesn't drop
 *    the whole batch to faker.
 *
 * The strict shapes intentionally mirror CreateBookingPayload / GuestContact.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const guestRecordStrict = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
});

export const guestRecordLoose = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
});

export const bookingRecordStrict = z.object({
  roomid: z.number().int().positive(),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  depositpaid: z.boolean(),
  bookingdates: z.object({ checkin: isoDate, checkout: isoDate }),
});

export const bookingRecordLoose = z.object({
  roomid: z.coerce.number().int(),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1),
  depositpaid: z.coerce.boolean(),
  bookingdates: z.object({ checkin: z.string().min(1), checkout: z.string().min(1) }),
});

export interface SchemaPair {
  strict: z.ZodTypeAny;
  loose: z.ZodTypeAny;
}

export const RECORD_SCHEMAS: Record<AiKind, SchemaPair> = {
  booking: { strict: bookingRecordStrict, loose: bookingRecordLoose },
  guest: { strict: guestRecordStrict, loose: guestRecordLoose },
};
