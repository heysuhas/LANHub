import manifest from './manifest.json';
import { PluginInstance, PluginManifest } from '@/core/types/plugin';
import { PluginContext } from '@/core/sdk';
import { ChatView } from './ChatView';

export const chatPlugin: PluginInstance & { View: React.ComponentType } = {
  manifest: manifest as PluginManifest,
  activate: (ctx: PluginContext) => {
    console.log('[Chat Plugin] Activated with SDK context', ctx.manifest.id);
  },
  View: ChatView,
};
