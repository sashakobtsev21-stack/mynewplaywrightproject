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
  const [checkin, checkout] = bookingWindow();
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
