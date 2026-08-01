import manifest from './manifest.json';
import { PluginInstance, PluginManifest } from '@/core/types/plugin';
import { PluginContext } from '@/core/sdk';
import { ScreenShareView } from './ScreenShareView';

export const screensharePlugin: PluginInstance & { View: React.ComponentType } = {
  manifest: manifest as PluginManifest,
  activate: (ctx: PluginContext) => {
    console.log('[ScreenShare Plugin] Activated with SDK context', ctx.manifest.id);
  },
  View: ScreenShareView,
};
