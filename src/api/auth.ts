import { ApiError, post, postText } from './client';

export type LoginResult = 'ok' | 'invalid' | 'banned';

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const body = await postText('auth/login', { username, password });
    return body.trim() === 'Fails.' ? 'invalid' : 'ok';
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'banned') return 'banned';
    if (error instanceof ApiError && error.status === 401) return 'invalid';
    throw error;
  }
}

export function logout(): Promise<void> {
  return post('auth/logout');
}
