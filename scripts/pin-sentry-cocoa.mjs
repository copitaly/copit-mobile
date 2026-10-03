import { readFile, writeFile } from 'node:fs/promises';

const packagePath = 'ios/App/CapApp-SPM/Package.swift';
const sentryPluginDependency = '        .package(name: "SentryCapacitor", path: "..\\..\\..\\node_modules\\@sentry\\capacitor"),';
const sentryCocoaPin = '        .package(url: "https://github.com/getsentry/sentry-cocoa", exact: "9.18.0"),';

const packageText = await readFile(packagePath, 'utf8');
if (!packageText.includes(sentryCocoaPin)) {
  if (!packageText.includes(sentryPluginDependency)) {
    throw new Error(`Could not find the SentryCapacitor dependency in ${packagePath}`);
  }
  await writeFile(packagePath, packageText.replace(sentryPluginDependency, `${sentryPluginDependency}\n${sentryCocoaPin}`));
}
