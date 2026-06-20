import packageJson from '../../package.json';

export const appVersion = packageJson.version;
export const sentryRelease = `copit-mobile@${packageJson.version}`;
