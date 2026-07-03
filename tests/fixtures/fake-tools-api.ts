import { vi, type Mock } from 'vitest';
import type { CreatorApi } from '../../src/api/creator';
import type { LogApi } from '../../src/api/log';

export type FakeLogApi = { [K in keyof LogApi]: Mock<LogApi[K]> };
export type FakeCreatorApi = { [K in keyof CreatorApi]: Mock<CreatorApi[K]> };

export const fakeLogApi = (): FakeLogApi => ({ main: vi.fn(async () => []), peers: vi.fn(async () => []) });

export const fakeCreatorApi = (): FakeCreatorApi => ({
  addTask: vi.fn(async () => 'task-1'),
  status: vi.fn(async () => []),
  torrentFile: vi.fn(async () => new Blob(['d4:infoe'])),
  deleteTask: vi.fn(async () => {}),
});
