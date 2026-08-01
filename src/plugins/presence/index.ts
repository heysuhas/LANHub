import manifest from './manifest.json';
import { PluginInstance, PluginManifest } from '@/core/types/plugin';
import { PluginContext } from '@/core/sdk';
import { PresenceView } from './PresenceView';

export const presencePlugin: PluginInstance & { View: React.ComponentType } = {
  manifest: manifest as PluginManifest,
  activate: (ctx: PluginContext) => {
    console.log('[Presence Plugin] Activated with SDK context', ctx.manifest.id);
  },
  View: PresenceView,
};
