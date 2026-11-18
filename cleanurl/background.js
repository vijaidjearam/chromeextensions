// Affiliate redirect services and the query parameter holding the real URL.
// To support a new network, add an entry here and its domain to host_permissions.
const REDIRECT_RULES = [
  { host: 'digidip.net',        params: ['url'] },
  { host: 'metaffiliation.com', params: ['redir'] },
  // Common networks you may also encounter on Dealabs:
  // { host: 'awin1.com',            params: ['ued', 'p'] },
  // { host: 'tradedoubler.com',     params: ['url'] },
  // { host: 'effiliation.com',      params: ['url'] },
];

// Prevent redirect loops: remember recent rewrites per tab
const recentlyCleaned = new Map();

function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

function isSafeHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns the real destination URL, or null if this is not an affiliate link.
 * Unwraps nested redirects (e.g. digidip -> metaffiliation -> shop).
 */
function extractActualUrl(rawUrl, depth = 0) {
  if (depth > 5) return null; // safety limit

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const rule = REDIRECT_RULES.find(r => hostMatches(parsed.hostname, r.host));
  if (!rule) return null;

  for (const param of rule.params) {
    // searchParams.get() already decodes the value; no decodeURIComponent needed
    const target = parsed.searchParams.get(param);
    if (target && isSafeHttpUrl(target)) {
      // The target may itself be another affiliate redirect
      return extractActualUrl(target, depth + 1) || target;
    }
  }
  return null;
}

// onBeforeRequest fires for every hop in a redirect chain,
// unlike webNavigation.onBeforeNavigate, which only sees the first URL.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return; // not associated with a tab

    const cleanUrl = extractActualUrl(details.url);
    if (!cleanUrl) return;

    // Avoid loops if the same tab is rewritten to the same URL repeatedly
    if (recentlyCleaned.get(details.tabId) === cleanUrl) return;
    recentlyCleaned.set(details.tabId, cleanUrl);
    setTimeout(() => recentlyCleaned.delete(details.tabId), 5000);

    console.log('[URL Cleaner]', details.url, '→', cleanUrl);
    chrome.tabs.update(details.tabId, { url: cleanUrl });
  },
  {
    urls: [
      '*://*.digidip.net/*',
      '*://*.metaffiliation.com/*'
    ],
    types: ['main_frame'] // top-level page only, ignores iframes and ads
  }
);

chrome.tabs.onRemoved.addListener((tabId) => recentlyCleaned.delete(tabId));
