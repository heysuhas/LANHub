export type CapabilityPermission =
  | 'events'
  | 'transport'
  | 'storage'
  | 'notifications'
  | 'ui'
  | 'identity';

export interface PluginSidebarContribution {
  id: string;
  label: string;
  icon: string; // Lucide icon name or SVG
  order?: number;
}

export interface PluginRoomToolbarContribution {
  id: string;
  label: string;
  icon: string;
}

export interface PluginSettingsContribution {
  id: string;
  label: string;
}

export interface PluginContributions {
  sidebar?: PluginSidebarContribution;
  roomToolbar?: PluginRoomToolbarContribution[];
  settings?: PluginSettingsContribution[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minCoreVersion: string;
  description: string;
  author?: string;
  permissions: CapabilityPermission[];
  contributes?: PluginContributions;
}

export interface PluginInstance {
  manifest: PluginManifest;
  activate: (ctx: any) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}
