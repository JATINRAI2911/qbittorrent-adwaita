import type { AppApi } from '../api/app';
import type { TransferApi } from '../api/transfer';
import { errorText, type ToastApi } from './mutate';

export interface GlobalCommandDeps {
  transfer: Pick<TransferApi, 'setSpeedLimitsMode'>;
  app: Pick<AppApi, 'setPreferences'>;
  toast: ToastApi;
  /** The mode the UI shows; setAltMode overrides it until the next sync confirms the server's. */
  altMode(): boolean;
  setAltMode(on: boolean): void;
  /** Keep the shown mode against syncs that predate the request; returns the release. */
  holdAltMode?(on: boolean): () => void;
  /** Poke the main sync so server_state catches up now. */
  refresh(): void;
}

export function createGlobalCommands(deps: GlobalCommandDeps) {
  async function setAltSpeed(on: boolean): Promise<boolean> {
    const before = deps.altMode();
    deps.setAltMode(on);
    const release = deps.holdAltMode?.(on);
    try {
      await deps.transfer.setSpeedLimitsMode(on);
    } catch (error) {
      release?.();
      // Only undo this click if nothing newer has changed the mode since.
      if (deps.altMode() === on) deps.setAltMode(before);
      deps.toast.show({ title: `Couldn’t switch speed limits: ${errorText(error)}` });
      deps.refresh();
      return false;
    }
    release?.();
    deps.toast.show({ title: on ? 'Alternative speed limits on' : 'Alternative speed limits off', undo: () => void setAltSpeed(!on) });
    deps.refresh();
    return true;
  }

  return {
    setAltSpeed,

    async savePreferences(changes: Record<string, unknown>, success: string): Promise<boolean> {
      if (Object.keys(changes).length === 0) return true;
      try {
        await deps.app.setPreferences(changes);
      } catch (error) {
        deps.toast.show({ title: `Couldn’t save: ${errorText(error)}` });
        return false;
      }
      deps.toast.show({ title: success });
      deps.refresh();
      return true;
    },
  };
}

export type GlobalCommands = ReturnType<typeof createGlobalCommands>;
