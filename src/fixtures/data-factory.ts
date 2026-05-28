import { faker } from '@faker-js/faker';
import type {
  CreateBookingPayload,
  GuestContact,
} from '../api/types/booking.types';
import { bookingWindow } from '../utils/date-helpers';

export const guestFactory = (overrides: Partial<GuestContact> = {}): GuestContact => ({
  firstname: faker.person.firstName(),
  lastname: faker.person.lastName(),
  email: faker.internet.email(),
  // Phone format on the demo is fairly relaxed; pad to be safe.
  phone: faker.string.numeric(11),
  ...overrides,
});

export const bookingFactory = (
  overrides: Partial<CreateBookingPayload> = {},
): CreateBookingPayload => {
  // The demo has a small fixed pool of rooms and tests run in parallel,
  // so a hard-coded near-future window collides constantly (POST -> 409).
  // Push the window deep into the future with a wide random offset so two
  // concurrent runs are extremely unlikely to land on the same nights.
  const offsetDays = faker.number.int({ min: 90, max: 300 });
  const nights = faker.number.int({ min: 1, max: 3 });
  const [checkin, checkout] = bookingWindow(offsetDays, nights);
  return {
    roomid: 1,
    depositpaid: true,
    bookingdates: { checkin, checkout },
    ...guestFactory(),
    ...overrides,
  };
};

export interface UiGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export const uiGuestFactory = (overrides: Partial<UiGuest> = {}): UiGuest => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.string.numeric(11),
  ...overrides,
});
