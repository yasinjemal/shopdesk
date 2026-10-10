import {chromium} from 'playwright';

// Launch the headless browser used by every interaction check. Set
// SHOPDESK_BROWSER_CHANNEL to use an installed Chrome, or
// SHOPDESK_BROWSER_EXECUTABLE to point at a specific Chromium binary when the
// Playwright-managed download is unavailable. Pages open with reduced motion,
// so smooth scrolling never races the next tap in a check.
export async function launch(options={}){
  const channel=process.env.SHOPDESK_BROWSER_CHANNEL,executablePath=process.env.SHOPDESK_BROWSER_EXECUTABLE;
  const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:channel?{channel}:{}),...options});
  const newPage=browser.newPage.bind(browser);browser.newPage=(pageOptions={})=>newPage({reducedMotion:'reduce',...pageOptions});
  return browser;
}
