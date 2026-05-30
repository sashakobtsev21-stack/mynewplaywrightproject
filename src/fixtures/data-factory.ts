import { faker } from '@faker-js/faker';
import type { CreateBookingPayload, GuestContact } from '../api/types/booking.types';
import type { RoomPayload, RoomType } from '../api/types/room.types';
import type { CreateMessagePayload } from '../api/types/message.types';
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

const ROOM_TYPES: RoomType[] = ['Single', 'Double', 'Twin', 'Family', 'Suite'];

export const roomFactory = (overrides: Partial<RoomPayload> = {}): RoomPayload => ({
  // The platform rejects duplicate room names, and the demo's seed rooms are
  // "101".."103"; a numeric name well outside that range avoids collisions when
  // runs overlap. roomName is sent as a string to match the API.
  roomName: String(faker.number.int({ min: 10_000, max: 99_999 })),
  type: faker.helpers.arrayElement(ROOM_TYPES),
  accessible: faker.datatype.boolean(),
  description: faker.lorem.sentence(),
  image: faker.image.url(),
  features: faker.helpers.arrayElements(['WiFi', 'TV', 'Radio', 'Safe', 'Views'], {
    min: 1,
    max: 3,
  }),
  roomPrice: faker.number.int({ min: 50, max: 400 }),
  ...overrides,
});

export const messageFactory = (
  overrides: Partial<CreateMessagePayload> = {},
): CreateMessagePayload => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.string.numeric(11),
  // Subject carries a unique marker so a freshly-created message can be found
  // again in the shared inbox without relying on ids the API doesn't return.
  subject: `Enquiry ${faker.string.alphanumeric(10)}`,
  description: faker.lorem.sentence({ min: 6, max: 12 }),
  ...overrides,
});
