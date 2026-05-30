import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import { cookieHeader } from '../../utils/api-helpers';
import type { ReportResponse } from '../types/report.types';

/** Occupancy report. Admin-only on the live platform, so every call takes a token. */
export class ReportClient extends BaseClient {
  async get(token: string): Promise<ReportResponse> {
    const res = await this.request.get(API.report, { headers: cookieHeader(token) });
    await this.expectOk(res, 'report.get');
    return res.json();
  }

  async getByRoom(roomid: number, token: string): Promise<ReportResponse> {
    const res = await this.request.get(`${API.report}/room/${roomid}`, {
      headers: cookieHeader(token),
    });
    await this.expectOk(res, `report.getByRoom(${roomid})`);
    return res.json();
  }
}
