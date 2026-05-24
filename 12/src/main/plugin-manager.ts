import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from './database';
import { PluginInfo, PluginManifest } from '../shared/types';

export class PluginManager {
  private appDataPath: string;
  private dbService: DatabaseService;
  private mainWindow: BrowserWindow | null;
  private plugins: Map<string, PluginInfo>;

  constructor(appDataPath: string, dbService: DatabaseService, mainWindow: BrowserWindow | null) {
    this.appDataPath = appDataPath;
    this.dbService = dbService;
    this.mainWindow = mainWindow;
    this.plugins = new Map();
  }

  async loadPlugins(): Promise<void> {
    try {
      const pluginsPath = path.join(this.appDataPath, 'plugins');
      if (!fs.existsSync(pluginsPath)) {
        return;
      }

      const entries = fs.readdirSync(pluginsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            await this.loadPlugin(entry.name);
          } catch (error) {
            console.error(`Failed to load plugin ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  private async loadPlugin(pluginId: string): Promise<void> {
    try {
      const pluginPath = path.join(this.appDataPath, 'plugins', pluginId);
      const manifestPath = path.join(pluginPath, 'package.json');

      if (!fs.existsSync(manifestPath)) {
        throw new Error('Plugin manifest not found');
      }

      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const mainPath = path.join(pluginPath, manifest.main);

      const pluginInfo: PluginInfo = {
        ...manifest,
        path: pluginPath,
        enabled: true
      };

      this.plugins.set(pluginId, pluginInfo);
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async listPlugins(): Promise<PluginInfo[]> {
    try {
      return Array.from(this.plugins.values());
    } catch (error) {
      console.error('Failed to list plugins:', error);
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.enabled = false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      throw error;
    }
  }

  async installPlugin(pluginPath: string): Promise<PluginInfo> {
    try {
      if (!fs.existsSync(pluginPath)) {
        throw new Error('Plugin path does not exist');
      }

      const manifestPath = path.join(pluginPath, 'package.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Plugin manifest not found');
      }

      const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const destPath = path.join(this.appDataPath, 'plugins', manifest.id);

      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      const pluginInfo: PluginInfo = {
        ...manifest,
        path: destPath,
        enabled: true
      };

      this.plugins.set(manifest.id, pluginInfo);
      return pluginInfo;
    } catch (error) {
      console.error('Failed to install plugin:', error);
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        this.plugins.delete(pluginId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      throw error;
    }
  }

  async reloadPlugin(pluginId: string): Promise<boolean> {
    try {
      if (this.plugins.has(pluginId)) {
        await this.loadPlugin(pluginId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to reload plugin:', error);
      throw error;
    }
  }

  async callPluginMethod(pluginId: string, method: string, ...args: any[]): Promise<any> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.enabled) {
        throw new Error('Plugin not found or disabled');
      }

      const mainPath = path.join(plugin.path, plugin.main);
      if (!fs.existsSync(mainPath)) {
        throw new Error('Plugin main file not found');
      }

      return { success: true, method: method, args: args };
    } catch (error) {
      console.error('Failed to call plugin method:', error);
      throw error;
    }
  }
}
