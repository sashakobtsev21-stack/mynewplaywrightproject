import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import type { Room, RoomListResponse } from '../types/room.types';

export class RoomClient extends BaseClient {
  async list(): Promise<RoomListResponse> {
    const res = await this.request.get(API.room);
    await this.expectOk(res, 'room.list');
    return res.json();
  }

  async getById(id: number): Promise<Room> {
    const res = await this.request.get(`${API.room}/${id}`);
    await this.expectOk(res, `room.getById(${id})`);
    return res.json();
  }
}
