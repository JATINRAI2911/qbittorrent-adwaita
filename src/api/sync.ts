import { getJson } from './client';
import type { MaindataResponse } from './types';

export function maindata(rid: number): Promise<MaindataResponse> {
  return getJson<MaindataResponse>('sync/maindata', { rid });
}
