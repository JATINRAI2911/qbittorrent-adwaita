import { startQbt } from './qbt';

export default async function globalSetup() {
  await startQbt();
}
