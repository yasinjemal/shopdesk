import {chromium} from 'playwright';

// Launch the headless browser used by every interaction check. Set
// SHOPDESK_BROWSER_CHANNEL to use an installed Chrome, or
// SHOPDESK_BROWSER_EXECUTABLE to point at a specific Chromium binary when the
// Playwright-managed download is unavailable.
export function launch(options={}){
  const channel=process.env.SHOPDESK_BROWSER_CHANNEL,executablePath=process.env.SHOPDESK_BROWSER_EXECUTABLE;
  return chromium.launch({headless:true,...(executablePath?{executablePath}:channel?{channel}:{}),...options});
}
