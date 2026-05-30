import { BaseClient } from './base.client';
import { API } from '../../config/constants';
import type { Branding } from '../types/branding.types';

/** Hotel branding (name, address, contact, map). Public on the live platform. */
export class BrandingClient extends BaseClient {
  async get(): Promise<Branding> {
    const res = await this.request.get(API.branding);
    await this.expectOk(res, 'branding.get');
    return res.json();
  }
}
