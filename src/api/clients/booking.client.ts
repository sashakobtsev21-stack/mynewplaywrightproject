import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import { cookieHeader } from '../../utils/api-helpers';
import type {
  Booking,
  BookingListResponse,
  CreateBookingPayload,
} from '../types/booking.types';

export interface ListBookingsQuery {
  roomid?: number;
  firstname?: string;
  lastname?: string;
}

export class BookingClient extends BaseClient {
  async list(params?: ListBookingsQuery): Promise<BookingListResponse> {
    const res = await this.request.get(API.booking, { params: params as Record<string, string | number> });
    await this.expectOk(res, 'booking.list');
    return res.json();
  }

  async getById(id: number): Promise<Booking> {
    const res = await this.request.get(`${API.booking}/${id}`);
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
    return res.json();
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
