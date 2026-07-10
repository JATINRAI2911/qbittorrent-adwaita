import { stopQbt } from './qbt';

export default function globalTeardown() {
  if (!process.env.E2E_KEEP) stopQbt();
}
