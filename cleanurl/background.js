// Function to extract the actual URL from the redirect URL
function extractActualUrl(url) {
  try {
    const urlParams = new URL(url).searchParams;
    const actualUrl = urlParams.get('url');
    if (actualUrl) {
      return decodeURIComponent(actualUrl);
    }
  } catch (error) {
    console.error('Error extracting URL:', error);
  }
  return null;
}

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url.includes('dealabs.digidip.net/visit')) {
    const actualUrl = extractActualUrl(details.url);
    if (actualUrl) {
      // Update the tab with the cleaned URL
      chrome.tabs.update(details.tabId, { url: actualUrl });
    }
  }
});

