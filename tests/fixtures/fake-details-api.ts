import { vi, type Mock } from 'vitest';
import { detailsApi, type DetailsApi } from '../../src/api/details';

export type FakeDetailsApi = { [K in keyof DetailsApi]: Mock<DetailsApi[K]> };

/** Reads resolve empty data, writes resolve undefined; override per test. */
export function fakeDetailsApi(): FakeDetailsApi {
  const fake = Object.fromEntries(Object.keys(detailsApi).map((key) => [key, vi.fn(async () => undefined)])) as unknown as FakeDetailsApi;
  fake.properties.mockImplementation(async () => ({}) as never);
  fake.pieceStates.mockImplementation(async () => []);
  fake.files.mockImplementation(async () => []);
  fake.trackers.mockImplementation(async () => []);
  fake.webseeds.mockImplementation(async () => []);
  fake.peers.mockImplementation(async () => ({ rid: 1, full_update: true, peers: {} }));
  return fake;
}
