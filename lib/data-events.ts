/**
 * Data Change Event Bus — closed-loop reactivity
 *
 * When any data source changes, all dependent components auto-refresh.
 * Dispatch on save, listen on mount.
 *
 * Events:
 *   training-log-updated    — training session logged
 *   gps-data-updated        — GPS import completed
 *   field-session-updated   — field session saved
 *   gym-workout-updated     — gym workout saved
 *   roster-updated          — player roster changed
 *   self-report-updated     — player self-reports imported
 *   match-data-updated      — match data entered
 *   season-calendar-updated — season events changed
 *   load-data-changed       — ANY load-related data changed (catch-all)
 */

type DataEvent =
  | "training-log-updated"
  | "gps-data-updated"
  | "field-session-updated"
  | "gym-workout-updated"
  | "roster-updated"
  | "self-report-updated"
  | "match-data-updated"
  | "season-calendar-updated"
  | "load-data-changed"
  | "knowledge-base-updated";

/** Dispatch a data change event (cross-tab via storage event) */
export function notifyChange(event: DataEvent): void {
  if (typeof window === "undefined") return;
  // Custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent(event));
  // Also trigger storage for cross-tab
  window.dispatchEvent(new Event("storage"));
}

/** Hook: listen for data changes and refresh */
export function useDataListener(
  events: DataEvent[],
  callback: () => void
): void {
  if (typeof window === "undefined") return;

  // This is not a React hook — it's a utility.
  // Use in useEffect:
  //   useEffect(() => {
  //     const unsub = listenToChanges(["training-log-updated"], refresh);
  //     return unsub;
  //   }, []);

  const handler = () => callback();
  events.forEach(e => window.addEventListener(e, handler));
  window.addEventListener("storage", handler);

  // Return cleanup function
  // (caller must handle this)
}

/** Get cleanup for useDataListener */
export function createDataListeners(
  events: DataEvent[],
  callback: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  events.forEach(e => window.addEventListener(e, handler));
  window.addEventListener("storage", handler);

  return () => {
    events.forEach(e => window.removeEventListener(e, handler));
    window.removeEventListener("storage", handler);
  };
}
