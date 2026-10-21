/**
 * PDF Studio - History Management
 * Maintains undo/redo stacks using snapshots of { bytes, annotations, formValues }
 */

const MAX_HISTORY_LENGTH = 30;

export function initHistory(initialSnapshot) {
  return {
    past: [],
    present: initialSnapshot ? cloneSnapshot(initialSnapshot) : null,
    future: []
  };
}

export function cloneSnapshot(snapshot) {
  if (!snapshot) return null;
  let bytesClone = null;
  if (snapshot.bytes) {
    try {
      bytesClone = snapshot.bytes.slice ? snapshot.bytes.slice() : new Uint8Array(snapshot.bytes);
    } catch {
      bytesClone = null;
    }
  }
  return {
    bytes: bytesClone,
    annotations: snapshot.annotations ? JSON.parse(JSON.stringify(snapshot.annotations)) : [],
    formValues: snapshot.formValues ? { ...snapshot.formValues } : {}
  };
}

export function pushHistorySnapshot(history, newSnapshot) {
  const current = history.present;
  const newPast = current ? [...history.past, current] : [...history.past];

  if (newPast.length > MAX_HISTORY_LENGTH) {
    newPast.shift();
  }

  return {
    past: newPast,
    present: cloneSnapshot(newSnapshot),
    future: []
  };
}

export function undoHistory(history) {
  if (history.past.length === 0) return history;

  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);
  const newFuture = history.present ? [history.present, ...history.future] : history.future;

  return {
    past: newPast,
    present: previous,
    future: newFuture
  };
}

export function redoHistory(history) {
  if (history.future.length === 0) return history;

  const next = history.future[0];
  const newFuture = history.future.slice(1);
  const newPast = history.present ? [...history.past, history.present] : history.past;

  return {
    past: newPast,
    present: next,
    future: newFuture
  };
}
