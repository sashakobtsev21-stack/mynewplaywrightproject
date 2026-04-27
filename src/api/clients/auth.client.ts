import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import type { LoginPayload, LoginResponse } from '../types/auth.types';

export class AuthClient extends BaseClient {
  async login(creds: LoginPayload): Promise<LoginResponse> {
    const res = await this.request.post(`${API.auth}/login`, { data: creds });
    await this.expectOk(res, 'auth.login');
    return res.json();
  }

  /** Returns true when the token is recognised by the API. */
  async validate(token: string): Promise<boolean> {
    const res = await this.request.post(`${API.auth}/validate`, { data: { token } });
    return res.ok();
  }

  async logout(token: string): Promise<void> {
    await this.request.post(`${API.auth}/logout`, { data: { token } });
  }
}
