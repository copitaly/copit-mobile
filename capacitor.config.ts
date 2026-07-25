import type { CapacitorConfig } from '@capacitor/cli';

const FIXED_WEBVIEW_HOSTNAME = 'localhost';
const FIXED_ANDROID_SCHEME = 'https';

if (process.env.CAP_SERVER_URL?.trim()) {
  throw new Error('CAP_SERVER_URL is not allowed for copit-mobile builds. Production Android must use the bundled https://localhost origin.');
}

if (process.env.CAPACITOR_SERVER_URL?.trim()) {
  throw new Error('CAPACITOR_SERVER_URL is not allowed for copit-mobile builds. Production Android must use the bundled https://localhost origin.');
}

const config: CapacitorConfig = {
  appId: 'com.peniel.platform',
  appName: 'COP Italy',
  webDir: 'www',
  server: {
    hostname: FIXED_WEBVIEW_HOSTNAME,
    androidScheme: FIXED_ANDROID_SCHEME,
  },
};

export default config;
