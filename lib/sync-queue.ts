"use client";

/**
 * Offline-first sync queue for training log saves and plan generations.
 * When the user is offline, actions are queued in localStorage.
 * When the network returns, the queue is replayed automatically.
 */

const QUEUE_KEY = "kenshin_sync_queue";

export interface SyncAction {
  id: string;
  type: "save_training_log" | "generate_plan" | "save_profile" | "save_settings";
  payload: unknown;
  timestamp: number;
  retries: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readQueue(): SyncAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncAction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn("[SyncQueue] Failed to write queue to localStorage", e);
  }
}

/** Add an action to the offline sync queue */
export function enqueueAction(
  type: SyncAction["type"],
  payload: unknown,
): string {
  const id = generateId();
  const action: SyncAction = {
    id,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = readQueue();
  queue.push(action);
  writeQueue(queue);

  console.log(`[SyncQueue] Enqueued ${type} (${id}), queue length: ${queue.length}`);
  return id;
}

/** Remove a specific action from the queue */
export function dequeueAction(id: string): void {
  const queue = readQueue().filter((a) => a.id !== id);
  writeQueue(queue);
}

/** Get current queue length */
export function getQueueLength(): number {
  return readQueue().length;
}

/** Get all queued actions */
export function getQueue(): SyncAction[] {
  return readQueue();
}

/**
 * Process the sync queue — replay all actions.
 * Returns the count of successfully processed items.
 * Failed items remain in the queue (with incremented retry count).
 */
export async function processQueue(
  handlers: {
    save_training_log?: (payload: unknown) => Promise<void>;
    generate_plan?: (payload: unknown) => Promise<void>;
    save_profile?: (payload: unknown) => Promise<void>;
    save_settings?: (payload: unknown) => Promise<void>;
  },
): Promise<{ processed: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { processed: 0, remaining: 0 };

  const MAX_RETRIES = 5;
  let processed = 0;
  const remaining: SyncAction[] = [];

  for (const action of queue) {
    const handler = handlers[action.type];
    if (!handler) {
      // Unknown action type — discard
      console.warn(`[SyncQueue] No handler for type: ${action.type}, discarding`);
      processed++;
      continue;
    }

    try {
      await handler(action.payload);
      processed++;
      console.log(`[SyncQueue] Processed ${action.type} (${action.id})`);
    } catch (err) {
      action.retries++;
      if (action.retries < MAX_RETRIES) {
        remaining.push(action);
        console.warn(
          `[SyncQueue] Failed ${action.type} (${action.id}), retry ${action.retries}/${MAX_RETRIES}`,
          err,
        );
      } else {
        console.error(
          `[SyncQueue] Discarding ${action.type} (${action.id}) after ${MAX_RETRIES} retries`,
          err,
        );
        processed++; // counted as handled (discarded)
      }
    }
  }

  writeQueue(remaining);
  console.log(`[SyncQueue] Processed: ${processed}, remaining: ${remaining.length}`);
  return { processed, remaining: remaining.length };
}

/**
 * Set up automatic sync when coming back online.
 * Call this once at app initialization.
 */
export function setupAutoSync(
  handlers: {
    save_training_log?: (payload: unknown) => Promise<void>;
    generate_plan?: (payload: unknown) => Promise<void>;
    save_profile?: (payload: unknown) => Promise<void>;
    save_settings?: (payload: unknown) => Promise<void>;
  },
  onSyncComplete?: (result: { processed: number; remaining: number }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    console.log("[SyncQueue] Back online, processing queue...");
    const result = await processQueue(handlers);
    onSyncComplete?.(result);
  };

  window.addEventListener("online", handleOnline);

  // Also try processing immediately if already online and queue has items
  if (navigator.onLine && getQueueLength() > 0) {
    handleOnline();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
