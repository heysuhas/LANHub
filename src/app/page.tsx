"use client";

import { AppProvider } from '@/contexts/AppContext';
import { CoreShell } from '@/core/shell/CoreShell';

export default function Home() {
  return (
    <AppProvider>
      <CoreShell />
    </AppProvider>
  );
}