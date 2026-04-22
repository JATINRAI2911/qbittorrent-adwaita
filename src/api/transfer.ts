import { post } from './client';

export const transferApi = {
  /** Idempotent, unlike toggleSpeedLimitsMode. 5.2 reads any non-zero `mode` as "on": send 0 or 1 only. */
  setSpeedLimitsMode: (alternative: boolean) => post('transfer/setSpeedLimitsMode', { mode: alternative ? 1 : 0 }),
};

export type TransferApi = typeof transferApi;
