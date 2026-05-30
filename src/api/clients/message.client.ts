import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import { cookieHeader } from '../../utils/api-helpers';
import type {
  CreateMessagePayload,
  CreateMessageResponse,
  MessageCount,
  MessageDetail,
  MessageListResponse,
} from '../types/message.types';

/**
 * Contact messages. Creating and reading messages is public on the live
 * platform (the contact form posts here); marking-read and deleting need the
 * admin token, so those take it explicitly.
 */
export class MessageClient extends BaseClient {
  async create(payload: CreateMessagePayload): Promise<CreateMessageResponse> {
    const res = await this.request.post(API.message, { data: payload });
    await this.expectOk(res, 'message.create');
    return res.json();
  }

  async list(): Promise<MessageListResponse> {
    const res = await this.request.get(API.message);
    await this.expectOk(res, 'message.list');
    return res.json();
  }

  async count(): Promise<MessageCount> {
    const res = await this.request.get(`${API.message}/count`);
    await this.expectOk(res, 'message.count');
    return res.json();
  }

  /**
   * Resolve a message id by its subject. create() returns no id, so tests that
   * need one look it up here; throwing keeps the lookup (and its branch) out of
   * the test body.
   */
  async idBySubject(subject: string): Promise<number> {
    const { messages } = await this.list();
    const match = messages.find((m) => m.subject === subject);
    if (!match) throw new Error(`no message found with subject "${subject}"`);
    return match.id;
  }

  async getById(id: number): Promise<MessageDetail> {
    const res = await this.request.get(`${API.message}/${id}`);
    await this.expectOk(res, `message.getById(${id})`);
    return res.json();
  }

  async markRead(id: number, token: string): Promise<void> {
    const res = await this.request.put(`${API.message}/${id}/read`, {
      data: { read: true },
      headers: cookieHeader(token),
    });
    if (res.status() >= 300) {
      throw new Error(`message.markRead(${id}) failed: HTTP ${res.status()} ${res.statusText()}`);
    }
  }

  async delete(id: number, token: string): Promise<void> {
    const res = await this.request.delete(`${API.message}/${id}`, {
      headers: cookieHeader(token),
    });
    if (res.status() >= 300) {
      throw new Error(`message.delete(${id}) failed: HTTP ${res.status()} ${res.statusText()}`);
    }
  }
}
