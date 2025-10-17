"use client";

import { AppProvider, useApp } from '@/contexts/AppContext';
import AuthForm from '@/components/AuthForm';
import Dashboard from '@/components/Dashboard';

function AppContent() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <AuthForm />;
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}