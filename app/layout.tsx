import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import '../styles/globals.css';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { ThemeProvider } from '@/presentation/providers';
import { ElectronSessionBridge } from '@/presentation/components/ElectronSessionBridge';
import { BuildCoreRootGate } from '@/presentation/components/BuildCoreRootGate';

export const dynamic = 'force-dynamic';

const themeStorageKey = buildcoreAppDefinition.themeStorageKey ?? 'buildcore_theme';

export const metadata: Metadata = {
  title: buildcoreAppDefinition.rootMetadataTitle ?? buildcoreAppDefinition.displayName,
  description:
    buildcoreAppDefinition.description ?? buildcoreAppDefinition.descriptionShort ?? undefined,
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem(${JSON.stringify(themeStorageKey)});
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = (t === 'dark' || (!t && d)) ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ElectronSessionBridge />
          <BuildCoreRootGate>{children}</BuildCoreRootGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
