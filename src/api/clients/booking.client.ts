import type { APIRequestContext } from '@playwright/test';
import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import { cookieHeader } from '../../utils/api-helpers';
import type {
  Booking,
  BookingListItem,
  BookingListResponse,
  CreateBookingPayload,
} from '../types/booking.types';
import type { RoomListResponse } from '../types/room.types';

export interface ListBookingsQuery {
  roomid?: number;
  firstname?: string;
  lastname?: string;
}

export class BookingClient extends BaseClient {
  // GET /api/booking is admin-only on the live platform. Constructor token lets
  // the fixture inject the worker-scoped admin token so list() works out of the
  // box; mutating endpoints still take an explicit token to keep negative tests
  // (which deliberately call without auth) untouched.
  constructor(request: APIRequestContext, private readonly token?: string) {
    super(request);
  }

  async list(params?: ListBookingsQuery): Promise<BookingListResponse> {
    const headers = this.token ? cookieHeader(this.token) : undefined;

    // The platform now insists on a roomid; when callers don't pin one we
    // fan out across every room and merge results so the public contract
    // ("list all bookings") still holds.
    if (params?.roomid !== undefined) {
      const res = await this.request.get(API.booking, {
        params: params as Record<string, string | number>,
        headers,
      });
      await this.expectOk(res, 'booking.list');
      return res.json();
    }

    const roomsRes = await this.request.get(API.room);
    await this.expectOk(roomsRes, 'booking.list:rooms');
    const { rooms } = (await roomsRes.json()) as RoomListResponse;

    const merged: BookingListItem[] = [];
    for (const room of rooms) {
      const perRoom = await this.request.get(API.booking, {
        params: { ...(params ?? {}), roomid: room.roomid } as Record<string, string | number>,
        headers,
      });
      await this.expectOk(perRoom, `booking.list(roomid=${room.roomid})`);
      const body = (await perRoom.json()) as BookingListResponse;
      if (Array.isArray(body.bookings)) {
        merged.push(...body.bookings);
      }
    }
    return { bookings: merged };
  }

  async getById(id: number): Promise<Booking> {
    // Like list(), GET by id is now admin-only on the live platform — re-use
    // the worker-scoped token injected via the constructor. Negative tests
    // that want to assert anonymous access stay on `request.get(...)` directly.
    const headers = this.token ? cookieHeader(this.token) : undefined;
    const res = await this.request.get(`${API.booking}/${id}`, { headers });
    await this.expectOk(res, `booking.getById(${id})`);
    return res.json();
  }

  async create(payload: CreateBookingPayload): Promise<Booking> {
    const res = await this.request.post(API.booking, { data: payload });
    await this.expectOk(res, 'booking.create');
    return res.json();
  }

  async update(id: number, payload: CreateBookingPayload, token: string): Promise<Booking> {
    const res = await this.request.put(`${API.booking}/${id}`, {
      data: payload,
      headers: cookieHeader(token),
    });
    await this.expectOk(res, `booking.update(${id})`);
    // The platform now wraps PUT responses as { booking: {...}, bookingid }, while
    // POST still returns the booking flat. Unwrap so callers can treat both the
    // same and our schema validations keep working.
    const body = (await res.json()) as Booking | { booking: Booking };
    return 'booking' in body ? body.booking : body;
  }

  async partialUpdate(
    id: number,
    payload: Partial<CreateBookingPayload>,
    token: string,
  ): Promise<Booking> {
    const res = await this.request.patch(`${API.booking}/${id}`, {
      data: payload,
      headers: cookieHeader(token),
    });
    await this.expectOk(res, `booking.partialUpdate(${id})`);
    return res.json();
  }

  async delete(id: number, token: string): Promise<void> {
    const res = await this.request.delete(`${API.booking}/${id}`, {
      headers: cookieHeader(token),
    });
    // Restful-Booker historically returned 201 on DELETE — accept 2xx and 204.
    if (res.status() >= 300) {
      throw new Error(`booking.delete(${id}) failed: HTTP ${res.status()} ${res.statusText()}`);
    }
  }
}
