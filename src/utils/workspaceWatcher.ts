import chokidar, { type FSWatcher } from 'chokidar';
import type { MessageBus } from '../messageBus';

type StopOptions = {
  cwd?: string;
};

const DEBOUNCE_MS = 400;

/**
 * Workspace watcher that emits `workspace.changed` when files under cwd change.
 * Uses chokidar for cross-platform recursive watching and debounces bursts.
 */
export class WorkspaceWatcher {
  private watchers = new Map<string, FSWatcher>();
  private timers = new Map<string, NodeJS.Timeout>();
  constructor(private messageBus: MessageBus) {}

  start(cwd: string) {
    if (!cwd || this.watchers.has(cwd)) return;

    const trigger = () => {
      const existing = this.timers.get(cwd);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.timers.delete(cwd);
        this.messageBus
          .emitEvent('workspace.changed', { cwd })
          .catch((error) => {
            console.warn(`workspace.changed emit failed for ${cwd}:`, error);
          });
      }, DEBOUNCE_MS);
      this.timers.set(cwd, timer);
    };

    const watcher = chokidar.watch(cwd, {
      ignoreInitial: true,
      persistent: true,
      depth: undefined,
      ignored: ['**/.git/**', '**/.DS_Store'],
    });

    watcher
      .on('add', trigger)
      .on('change', trigger)
      .on('unlink', trigger)
      .on('addDir', trigger)
      .on('unlinkDir', trigger)
      .on('error', (error) => {
        console.warn(`Workspace watcher error for ${cwd}:`, error);
        this.stop({ cwd });
      });

    this.watchers.set(cwd, watcher);
  }

  stop({ cwd }: StopOptions = {}) {
    if (cwd) {
      this.dispose(cwd);
      return;
    }
    for (const key of [...this.watchers.keys()]) {
      this.dispose(key);
    }
  }

  private dispose(cwd: string) {
    const watcher = this.watchers.get(cwd);
    if (watcher) {
      watcher
        .close()
        .catch((err) => console.warn(`Close watcher failed for ${cwd}:`, err));
      this.watchers.delete(cwd);
    }
    const timer = this.timers.get(cwd);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(cwd);
    }
  }
}
