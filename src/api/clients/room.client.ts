import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import { cookieHeader } from '../../utils/api-helpers';
import type { CreateRoomResponse, Room, RoomListResponse, RoomPayload } from '../types/room.types';

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

  // Create returns only { success: true } — the platform doesn't echo the new
  // roomid. Callers that need it list() and match on roomName (see findByName).
  async create(payload: RoomPayload, token: string): Promise<CreateRoomResponse> {
    const res = await this.request.post(API.room, {
      data: payload,
      headers: cookieHeader(token),
    });
    await this.expectOk(res, 'room.create');
    return res.json();
  }

  async update(id: number, payload: RoomPayload, token: string): Promise<Room> {
    const res = await this.request.put(`${API.room}/${id}`, {
      data: { roomid: id, ...payload },
      headers: cookieHeader(token),
    });
    await this.expectOk(res, `room.update(${id})`);
    return res.json();
  }

  async delete(id: number, token: string): Promise<void> {
    const res = await this.request.delete(`${API.room}/${id}`, {
      headers: cookieHeader(token),
    });
    if (res.status() >= 300) {
      throw new Error(`room.delete(${id}) failed: HTTP ${res.status()} ${res.statusText()}`);
    }
  }

  /** Convenience for tests: create() returns no id, so resolve it by name. */
  async findByName(roomName: string): Promise<Room | undefined> {
    const { rooms } = await this.list();
    return rooms.find((r) => r.roomName === roomName);
  }

  /**
   * Strict variant of findByName — throws instead of returning undefined, so a
   * test that just created a room can resolve its id without a branch.
   */
  async idByName(roomName: string): Promise<number> {
    const room = await this.findByName(roomName);
    if (!room) throw new Error(`no room found with name "${roomName}"`);
    return room.roomid;
  }
}
