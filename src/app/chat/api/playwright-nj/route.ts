const puppeteerFlags = [
  "--allow-pre-commit-input",
  // "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-extensions-with-background-pages",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-hang-monitor",
  // "--disable-ipc-flooding-protection",
  "--disable-popup-blocking",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-sync",
  // "--enable-automation",
  // TODO(sadym): remove '--enable-blink-features=IdleDetection' once
  // IdleDetection is turned on by default.
  "--enable-blink-features=IdleDetection",
  "--export-tagged-pdf",
  "--force-color-profile=srgb",
  "--metrics-recording-only",
  "--no-first-run",
  "--password-store=basic",
  "--use-mock-keychain",
];
const puppeteerDisableFeatures = [
  "Translate",
  "BackForwardCache",
  // AcceptCHFrame disabled because of crbug.com/1348106.
  "AcceptCHFrame",
  "MediaRouter",
  "OptimizationHints",
];
const puppeteerEnableFeatures = ["NetworkServiceInProcess2"];
const chromiumFlags = [
  "--disable-domain-reliability", // https://github.com/GoogleChrome/chrome-launcher/blob/main/docs/chrome-flags-for-tools.md#background-networking
  "--disable-print-preview", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisablePrintPreview&ss=chromium
  "--disable-speech-api", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSpeechAPI&ss=chromium
  "--disk-cache-size=33554432", // https://source.chromium.org/search?q=lang:cpp+symbol:kDiskCacheSize&ss=chromium
  "--mute-audio", // https://source.chromium.org/search?q=lang:cpp+symbol:kMuteAudio&ss=chromium
  "--no-default-browser-check", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoDefaultBrowserCheck&ss=chromium
  "--no-pings", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoPings&ss=chromium
  // "--single-process", // Needs to be single-process to avoid `prctl(PR_SET_NO_NEW_PRIVS) failed` error
  "--font-render-hinting=none", // https://github.com/puppeteer/puppeteer/issues/2410#issuecomment-560573612
];
const chromiumDisableFeatures = [
  "AudioServiceOutOfProcess",
  "IsolateOrigins",
  "site-per-process",
];
const chromiumEnableFeatures = ["SharedArrayBuffer"];
const graphicsFlags = [
  "--hide-scrollbars", // https://source.chromium.org/search?q=lang:cpp+symbol:kHideScrollbars&ss=chromium
  "--ignore-gpu-blocklist", // https://source.chromium.org/search?q=lang:cpp+symbol:kIgnoreGpuBlocklist&ss=chromium
  "--in-process-gpu", // https://source.chromium.org/search?q=lang:cpp+symbol:kInProcessGPU&ss=chromium
  "--window-size=1920,1080", // https://source.chromium.org/search?q=lang:cpp+symbol:kWindowSize&ss=chromium
];
// https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md
// Blocked by https://github.com/Sparticuz/chromium/issues/247
//this.graphics
//  ? graphicsFlags.push("--use-gl=angle", "--use-angle=swiftshader")
//  : graphicsFlags.push("--disable-webgl");
graphicsFlags.push("--use-gl=angle", "--use-angle=swiftshader");
const insecureFlags = [
  // "--allow-running-insecure-content", // https://source.chromium.org/search?q=lang:cpp+symbol:kAllowRunningInsecureContent&ss=chromium
  // "--disable-setuid-sandbox", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSetuidSandbox&ss=chromium
  // "--disable-site-isolation-trials", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableSiteIsolation&ss=chromium
  // "--disable-web-security", // https://source.chromium.org/search?q=lang:cpp+symbol:kDisableWebSecurity&ss=chromium
  // "--no-sandbox", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoSandbox&ss=chromium
  "--no-zygote", // https://source.chromium.org/search?q=lang:cpp+symbol:kNoZygote&ss=chromium
];
const headlessFlags = [
  "--headless='new'",
  // "--headless='shell'"
];
const chromeFlags = [
  ...puppeteerFlags,
  ...chromiumFlags,
  `--disable-features=${[
      ...puppeteerDisableFeatures,
      ...chromiumDisableFeatures,
  ].join(",")}`,
  `--enable-features=${[
      ...puppeteerEnableFeatures,
      ...chromiumEnableFeatures,
  ].join(",")}`,
  ...graphicsFlags,
  ...insecureFlags,
  ...headlessFlags,
];




import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { supabaseServer } from '@/lib/db/supabaseServer';
import { decryptedText } from '@/lib/utils';
// import { chromeFlags } from '@/lib/constants';

const { chromium: playwright } = require("playwright-core");
const chromium = require("@sparticuz/chromium");

// import { playwriht: playwright } from 'playwright-core';

export async function GET(request: Request) {

  // const code = request.headers.get('code');
  // if (!code || code !== process.env.NEXT_PUBLIC_ACCESS_CODE) {
  //   console.log('code is required');
  //   return NextResponse.json({ error: 'code is required' }, { status: 400 });
  // }

  console.log('GET /api/playwright with query', request.url);
  const url = new URL(request.url);
  let email = ''
  let password = ''

  const id = url.searchParams.get('id');
  if (!id) {
    console.log('id is required');
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  } else {
    console.log('Fetching user', id);
    const { data, error } = await supabaseServer
      .from('user_profile')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.log('Error fetching user', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('Fetched user', data);
    console.log('Encrypted email:', data.linkedin_email);
    console.log('Encrypted password:', data.linkedin_password);

    email = data.linkedin_email
    password = await decryptedText(data.linkedin_password);

    console.log('Decrypted email:', email);
    console.log('Decrypted password:', password);

    // return NextResponse.json({ data, email, password }, { status: 200 });
  }
  const executablePath = process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome';
  console.log('Launching browser');
  chromium.setHeadlessMode = true;
  // const browser = await playwright.launch({
  //   args: chromeFlags,
  //   executablePath: executablePath || await chromium.executablePath(),
  //   headless: true
    
  // });

  const browser = await playwright.launch({
    args: chromeFlags,
    executablePath: await chromium.executablePath(),
    headless: true,
    proxy: {
      server: 'http://pr.oxylabs.io:7777',       // or e.g. 'http://pr.oxylabs.io:7777'
      username: process.env.OXY_USER,
      password: process.env.OXY_PASS
    },
  });

  try {
    // const page = await browser.newPage();

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/109.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Route handler will block (not load) everything except 'document' and 'script' resources
    // await page.route('**/*', async (route: any) => {
    //   const resourceType = route.request().resourceType();
    //   if (['document', 'script'].includes(resourceType)) {
    //     await route.continue();
    //   } else {
    //     await route.abort();
    //   }
    // });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.goto('https://www.linkedin.com/login');
    console.log('Waiting for page to load');
    await page.waitForTimeout(2000); // Simulate delay
    
    await page.fill('#username', email);
    console.log('Done filling email');
    await page.waitForTimeout(3000); // Simulate delay
    
    await page.fill('#password', password);
    console.log('Done filling password');
    await page.waitForTimeout(2500); // Simulate delay

    await page.click('button[type="submit"]');

    // Poll the URL to check if it matches
    let targetReached = false;
    while (!targetReached) {
      const currentUrl = page.url();
      if (currentUrl === 'https://www.linkedin.com/feed/') {
        console.log('Target URL reached:', currentUrl);
        targetReached = true;
      } else {
        console.log('Current URL:', currentUrl);
        await page.waitForTimeout(1000); // Wait for 1 second before checking again
      }
    }

    const cookies = await page.context().cookies();
    console.log('Closing browser');
    await browser.close();
    
    console.log('Returning cookies');
    return NextResponse.json({ cookies });
  } catch (err: any) {
    await browser.close();
    console.log('Error:', err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
