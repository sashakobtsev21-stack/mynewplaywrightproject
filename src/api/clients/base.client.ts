import type { APIRequestContext, APIResponse } from '@playwright/test';
import { childLogger } from '../../utils/logger';

const log = childLogger('api');

export class BaseClient {
  constructor(protected readonly request: APIRequestContext) {}

  /** Throws with a useful body snippet on non-2xx. Returns the response on success. */
  protected async expectOk(res: APIResponse, ctx: string): Promise<APIResponse> {
    if (!res.ok()) {
      const body = await res.text().catch(() => '<no body>');
      log.error({ ctx, status: res.status(), body: body.slice(0, 500) }, 'api call failed');
      throw new Error(`${ctx} failed: HTTP ${res.status()} ${res.statusText()} :: ${body.slice(0, 200)}`);
    }
    return res;
  }
}
