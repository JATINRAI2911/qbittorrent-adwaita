import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import * as auth from '../api/auth';
import * as sync from '../api/sync';
import type { Category, MaindataResponse, ServerState, Torrent } from '../api/types';
import { applyMaindata, type SyncState } from '../sync/maindata';
import { Poller } from '../sync/poller';

export type Connection = 'starting' | 'login' | 'online' | 'offline';
export type LoginOutcome = 'ok' | 'invalid' | 'banned' | 'network';

export interface SessionDeps {
  login(username: string, password: string): Promise<auth.LoginResult>;
  logout(): Promise<void>;
  maindata(rid: number): Promise<MaindataResponse>;
  isHidden(): boolean;
  /** Calls `callback` whenever the page becomes visible; returns an unsubscribe function. */
  onVisible(callback: () => void): () => void;
}

/** Wraps a plain object in a deep `$state` proxy so each field is tracked separately. */
function reactive<T extends object>(value: T): T {
  const proxy = $state(value);
  return proxy;
}

export class Session implements SyncState {
  connection = $state<Connection>('starting');
  /** True once any torrent data has arrived; stays true across re-logins so the list is kept. */
  loaded = $state(false);
  retryIn = $state(0);
  server = $state<Partial<ServerState>>({});
  rid = 0;
  readonly torrents = new SvelteMap<string, Torrent>();
  readonly categories = new SvelteMap<string, Category>();
  readonly tags = new SvelteSet<string>();
  readonly trackers = new SvelteMap<string, string[]>();

  #deps: SessionDeps;
  #poller: Poller;
  #countdown: ReturnType<typeof setInterval> | undefined;
  #unlisten: (() => void) | undefined;

  constructor(deps: SessionDeps) {
    this.#deps = deps;
    this.#poller = new Poller({
      fetch: () => deps.maindata(this.rid),
      apply: (response) => {
        const summary = applyMaindata(this, response, reactive);
        if (summary.desync) this.rid = 0;
        this.loaded = true;
      },
      isHidden: () => deps.isHidden(),
      onOnline: () => {
        this.connection = 'online';
        this.#stopCountdown();
      },
      onAuthLost: () => {
        this.connection = 'login';
        this.#stopCountdown();
      },
      onOffline: (seconds) => {
        this.connection = 'offline';
        this.#startCountdown(seconds);
      },
    });
  }

  start(): void {
    this.#unlisten ??= this.#deps.onVisible(() => this.#poller.pokeNow());
    this.#poller.start();
  }

  stop(): void {
    this.#poller.stop();
    this.#stopCountdown();
    this.#unlisten?.();
    this.#unlisten = undefined;
  }

  retryNow(): void {
    this.#poller.pokeNow();
  }

  async login(username: string, password: string): Promise<LoginOutcome> {
    let result: auth.LoginResult;
    try {
      result = await this.#deps.login(username, password);
    } catch {
      return 'network';
    }
    if (result !== 'ok') return result;
    this.rid = 0; // full resync: the server forgot our previous rid with the old session
    this.start();
    return 'ok';
  }

  async logout(): Promise<void> {
    this.#poller.stop();
    try {
      await this.#deps.logout();
    } finally {
      this.connection = 'login';
    }
  }

  #startCountdown(seconds: number): void {
    this.#stopCountdown();
    this.retryIn = seconds;
    this.#countdown = setInterval(() => {
      this.retryIn = Math.max(0, this.retryIn - 1);
    }, 1000);
  }

  #stopCountdown(): void {
    clearInterval(this.#countdown);
    this.#countdown = undefined;
  }
}

export const browserDeps: SessionDeps = {
  login: auth.login,
  logout: auth.logout,
  maindata: sync.maindata,
  isHidden: () => document.hidden,
  onVisible(callback) {
    const handler = () => {
      if (!document.hidden) callback();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
};

export const session = new Session(browserDeps);
