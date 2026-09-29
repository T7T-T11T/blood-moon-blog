/** Optional statistics; unavailable browser storage means no tracking. */
import { recordVisit } from '../api/visits';
export function trackPageView(pagePath) {
  if (pagePath.startsWith('/admin') || pagePath.startsWith('/login')) return;
  try {
    if (localStorage.getItem('visit-statistics') !== 'enabled' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  } catch { return; }
  recordVisit({ page_path: pagePath, consent: true }).catch(() => {});
}
