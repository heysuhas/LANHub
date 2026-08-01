"use client";

import React, { useEffect, useState } from 'react';
import { useCoreState, coreStore } from '../state';
import { coreRuntime } from '../runtime';
import { corePresence } from '../presence';
import { coreTransport } from '../transport';
import { coreEventBus } from '../event-bus';
import AuthForm from '@/components/AuthForm';

// Import built-in plugins
import { presencePlugin } from '@/plugins/presence';
import { chatPlugin } from '@/plugins/chat';
import { filesPlugin } from '@/plugins/files';
import { roomsPlugin } from '@/plugins/rooms';
import { screensharePlugin } from '@/plugins/screenshare';

import { Activity, MessageSquare, HardDrive, FolderPlus, Monitor, Wifi, LogOut, ShieldCheck, Moon, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';
import { toast, Toaster } from 'sonner';

const pluginMap: Record<string, { manifest: any; View: React.ComponentType }> = {
  presence: presencePlugin,
  chat: chatPlugin,
  files: filesPlugin,
  rooms: roomsPlugin,
  screenshare: screensharePlugin,
};

const pluginIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  MessageSquare,
  HardDrive,
  FolderPlus,
  Monitor,
};

export function CoreShell() {
  const { currentUser, currentDevice, activePluginId } = useCoreState();
  const [initialized, setInitialized] = useState(false);
  const { theme, setTheme } = useTheme();

  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lanhub_server_url') || '';
    }
    return '';
  });

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customServerUrl.trim()) {
      localStorage.setItem('lanhub_server_url', customServerUrl.trim());
      toast.success('Custom Server Relay URL saved!');
    } else {
      localStorage.removeItem('lanhub_server_url');
      toast.info('Reverted to default local subnet endpoint.');
    }
    setIsServerSettingsOpen(false);
  };

  const handleResetServerUrl = () => {
    setCustomServerUrl('');
    localStorage.removeItem('lanhub_server_url');
    toast.info('Reverted to default local subnet endpoint.');
    setIsServerSettingsOpen(false);
  };

  useEffect(() => {
    // Register built-in plugins
    coreRuntime.registerPlugin(presencePlugin);
    coreRuntime.registerPlugin(chatPlugin);
    coreRuntime.registerPlugin(filesPlugin);
    coreRuntime.registerPlugin(roomsPlugin);
    coreRuntime.registerPlugin(screensharePlugin);

    void coreRuntime.activateAll();
    corePresence.startPresenceMonitoring();
    void coreTransport.connect();

    // Listen for notification toasts
    const unsub = coreEventBus.on('notification:show', ({ title, message, type }) => {
      if (type === 'error') toast.error(title, { description: message });
      else if (type === 'success') toast.success(title, { description: message });
      else toast.info(title, { description: message });
    });

    setInitialized(true);

    return () => {
      unsub();
      corePresence.stopPresenceMonitoring();
      coreTransport.disconnect();
    };
  }, []);

  if (!currentUser) {
    return <AuthForm />;
  }

  const activePlugin = pluginMap[activePluginId] || presencePlugin;
  const ActiveView = activePlugin.View;

  const sidebarItems = [
    { id: 'presence', label: 'Presence Hub', icon: Activity },
    { id: 'chat', label: 'Encrypted Chat', icon: MessageSquare },
    { id: 'files', label: 'File Sharing', icon: HardDrive },
    { id: 'rooms', label: 'Rooms', icon: FolderPlus },
    { id: 'screenshare', label: 'Screen Share', icon: Monitor },
  ];

  const handleLogout = () => {
    coreStore.setState({ currentUser: null, currentDevice: null });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Toaster position="top-right" />

      {/* Top Application Header */}
      <header className="h-16 border-b px-6 flex items-center justify-between bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">LANHub</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">v1.0 Core</Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Local-first Collaboration Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cloud Relay & Network Settings Dialog */}
          <Dialog open={isServerSettingsOpen} onOpenChange={setIsServerSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Network & Cloud Relay Settings">
                <Globe className="h-5 h-5 text-primary" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Network & Cloud Relay Configuration
                </DialogTitle>
                <DialogDescription>
                  Configure LANHub server endpoint mode (Local LAN, Cloud Relay, or Custom VPN/Server URL)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveServerUrl} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="server-url">Server Endpoint URL</Label>
                  <Input
                    id="server-url"
                    placeholder="Leave empty for local subnet (http://192.168.1.4:8080)"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For cloud deployments (Render, Railway, Fly.io, Vercel), enter your deployed server URL (e.g. <code>https://my-lanhub-relay.onrender.com</code>).
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleResetServerUrl}>
                    Use Default Subnet
                  </Button>
                  <Button type="submit" className="flex-1">
                    Save Endpoint
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            <Sun className="h-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <div className="flex items-center gap-2 border-l pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold">{currentUser.displayName}</div>
              <div className="text-xs text-muted-foreground">@{currentUser.username}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Shell Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r bg-card/40 p-4 flex flex-col gap-2 shrink-0 hidden md:flex">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            Modules
          </div>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePluginId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => coreStore.setState({ activePluginId: item.id })}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Viewport Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
          <ActiveView />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden border-t bg-card/90 backdrop-blur fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 px-1 shadow-lg">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePluginId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => coreStore.setState({ activePluginId: item.id })}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
