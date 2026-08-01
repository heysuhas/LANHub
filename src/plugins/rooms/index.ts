import manifest from './manifest.json';
import { PluginInstance, PluginManifest } from '@/core/types/plugin';
import { PluginContext } from '@/core/sdk';
import { RoomsView } from './RoomsView';

export const roomsPlugin: PluginInstance & { View: React.ComponentType } = {
  manifest: manifest as PluginManifest,
  activate: (ctx: PluginContext) => {
    console.log('[Rooms Plugin] Activated with SDK context', ctx.manifest.id);
  },
  View: RoomsView,
};
