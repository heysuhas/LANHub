import manifest from './manifest.json';
import { PluginInstance, PluginManifest } from '@/core/types/plugin';
import { PluginContext } from '@/core/sdk';
import { FilesView } from './FilesView';

export const filesPlugin: PluginInstance & { View: React.ComponentType } = {
  manifest: manifest as PluginManifest,
  activate: (ctx: PluginContext) => {
    console.log('[Files Plugin] Activated with SDK context', ctx.manifest.id);
  },
  View: FilesView,
};
