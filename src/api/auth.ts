import { ApiError, post, request } from './client';

export type LoginResult = 'ok' | 'invalid' | 'banned';

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const response = await request('auth/login', { method: 'POST', params: { username, password } });
    return (await response.text()).trim() === 'Fails.' ? 'invalid' : 'ok';
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'banned') return 'banned';
    if (error instanceof ApiError && error.status === 401) return 'invalid';
    throw error;
  }
}

export function logout(): Promise<void> {
  return post('auth/logout');
}
