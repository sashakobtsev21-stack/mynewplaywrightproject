export interface GuestContact {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
}

export interface BookingDates {
  /** ISO date YYYY-MM-DD */
  checkin: string;
  /** ISO date YYYY-MM-DD */
  checkout: string;
}

export interface CreateBookingPayload extends GuestContact {
  roomid: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
}

export interface Booking extends CreateBookingPayload {
  bookingid: number;
}

export interface BookingListItem {
  bookingid: number;
}

export interface BookingListResponse {
  bookings: BookingListItem[];
}
