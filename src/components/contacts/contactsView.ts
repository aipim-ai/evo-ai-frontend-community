export type ContactsView = 'priority' | 'all';

const STORAGE_KEY = 'contacts.view';

// The last view sticks per browser, so whoever works from the priority list
// lands on it again.
export function readStoredView(): ContactsView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'priority' ? 'priority' : 'all';
  } catch {
    return 'all';
  }
}

export function storeView(view: ContactsView) {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Storage blocked: the choice just won't persist.
  }
}
