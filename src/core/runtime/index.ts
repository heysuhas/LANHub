import { PluginManifest, PluginInstance, CapabilityPermission } from '../types/plugin';
import { coreStore } from '../state';
import { createPluginContext } from '../sdk';

export class PluginRuntimeManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private activePlugins: Set<string> = new Set();

  registerPlugin(plugin: PluginInstance): void {
    const { manifest } = plugin;
    if (this.plugins.has(manifest.id)) {
      console.warn(`[LANHub Runtime] Plugin ${manifest.id} already registered.`);
      return;
    }

    this.validateManifest(manifest);
    this.plugins.set(manifest.id, plugin);

    // Add to coreStore registered plugins
    coreStore.setState((prev) => ({
      registeredPlugins: [...prev.registeredPlugins, manifest],
    }));

    console.log(`[LANHub Runtime] Registered plugin: ${manifest.name} (v${manifest.version})`);
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in runtime registry.`);
    }

    if (this.activePlugins.has(pluginId)) {
      return;
    }

    try {
      const ctx = createPluginContext(plugin.manifest);
      await plugin.activate(ctx);
      this.activePlugins.add(pluginId);
      console.log(`[LANHub Runtime] Activated plugin: ${plugin.manifest.name}`);
    } catch (err) {
      console.error(`[LANHub Runtime] Failed to activate plugin ${pluginId}:`, err);
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !this.activePlugins.has(pluginId)) return;

    if (plugin.deactivate) {
      try {
        await plugin.deactivate();
      } catch (err) {
        console.error(`[LANHub Runtime] Error deactivating plugin ${pluginId}:`, err);
      }
    }

    this.activePlugins.delete(pluginId);
  }

  async activateAll(): Promise<void> {
    for (const pluginId of this.plugins.keys()) {
      await this.activatePlugin(pluginId);
    }
  }

  getRegisteredPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Plugin manifest missing required fields: id, name, version.');
    }
  }
}

export const coreRuntime = new PluginRuntimeManager();
