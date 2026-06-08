/**
 * Date helpers for tests. Intentionally small — Restful-Booker uses ISO
 * date strings (YYYY-MM-DD) everywhere, so that's the only output format.
 */

export const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (d: Date, days: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

export const futureDate = (offsetDays: number): string =>
  toIsoDate(addDays(new Date(), offsetDays));

/** Returns [checkin, checkout] starting `offsetDays` from today, lasting `nights`. */
export const bookingWindow = (offsetDays = 7, nights = 3): [string, string] => {
  const checkin = addDays(new Date(), offsetDays);
  const checkout = addDays(checkin, nights);
  return [toIsoDate(checkin), toIsoDate(checkout)];
};
