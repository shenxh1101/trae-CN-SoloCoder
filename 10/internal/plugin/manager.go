package plugin

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"dockdev/pkg/utils"
)

type HookType string

const (
	HookPreInit             HookType = "pre-init"
	HookPostInit            HookType = "post-init"
	HookPreStart            HookType = "pre-start"
	HookPostStart           HookType = "post-start"
	HookPreStop             HookType = "pre-stop"
	HookPostStop            HookType = "post-stop"
	HookPreRestart          HookType = "pre-restart"
	HookPostRestart         HookType = "post-restart"
	HookPreBuild            HookType = "pre-build"
	HookPostBuild           HookType = "post-build"
	HookPreBackup           HookType = "pre-backup"
	HookPostBackup          HookType = "post-backup"
	HookPreRestore          HookType = "pre-restore"
	HookPostRestore         HookType = "post-restore"
	HookPreSnapshot         HookType = "pre-snapshot"
	HookPostSnapshot        HookType = "post-snapshot"
	HookPreRestoreSnapshot  HookType = "pre-restore-snapshot"
	HookPostRestoreSnapshot HookType = "post-restore-snapshot"
	HookPreDeleteSnapshot   HookType = "pre-delete-snapshot"
	HookPostDeleteSnapshot  HookType = "post-delete-snapshot"
	HookPreClone            HookType = "pre-clone"
	HookPostClone           HookType = "post-clone"
)

type Plugin struct {
	Name        string
	Path        string
	Description string
	Hooks       []HookType
}

type Manager struct {
	plugins map[string]*Plugin
}

func NewManager() *Manager {
	return &Manager{
		plugins: make(map[string]*Plugin),
	}
}

func (pm *Manager) LoadPlugins(projectName string) error {
	pluginsDir := filepath.Join(utils.GetProjectConfigDir(projectName), "plugins")
	if !utils.FileExists(pluginsDir) {
		return nil
	}

	entries, err := os.ReadDir(pluginsDir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		pluginPath := filepath.Join(pluginsDir, entry.Name())
		plugin, err := pm.loadPlugin(pluginPath)
		if err != nil {
			utils.PrintWarning("Failed to load plugin %s: %v", entry.Name(), err)
			continue
		}
		pm.plugins[plugin.Name] = plugin
		utils.PrintInfo("Loaded plugin: %s", plugin.Name)
	}

	return nil
}

func (pm *Manager) loadPlugin(path string) (*Plugin, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	plugin := &Plugin{
		Name: name,
		Path: path,
	}

	hdr := strings.Split(string(content), "\n")[0]
	if strings.HasPrefix(hdr, "# dockdev-plugin:") {
		meta := strings.TrimPrefix(hdr, "# dockdev-plugin:")
		parts := strings.Split(meta, ",")
		for _, part := range parts {
			kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
			if len(kv) == 2 {
				key := strings.TrimSpace(kv[0])
				value := strings.TrimSpace(kv[1])
				switch key {
				case "name":
					plugin.Name = value
				case "description":
					plugin.Description = value
				case "hooks":
					hooks := strings.Split(value, "|")
					for _, h := range hooks {
						plugin.Hooks = append(plugin.Hooks, HookType(strings.TrimSpace(h)))
					}
				}
			}
		}
	}

	return plugin, nil
}

func (pm *Manager) ExecuteHook(hook HookType, projectName string, env map[string]string) error {
	var errs []string

	for _, p := range pm.plugins {
		if !pm.hasHook(p, hook) {
			continue
		}

		utils.PrintInfo("Executing plugin hook %s: %s", hook, p.Name)

		cmd := exec.Command(p.Path)
		cmd.Env = append(os.Environ(), fmt.Sprintf("DOCKDEV_HOOK=%s", hook))
		cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKDEV_PROJECT=%s", projectName))
		cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKDEV_PLUGIN=%s", p.Name))
		cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKDEV_PROJECT_DIR=%s", utils.GetProjectConfigDir(projectName)))
		cmd.Env = append(cmd.Env, fmt.Sprintf("DOCKDEV_HOOK_TIME=%d", time.Now().Unix()))

		for k, v := range env {
			upperKey := strings.ToUpper(strings.ReplaceAll(k, "-", "_"))
			if !strings.HasPrefix(upperKey, "DOCKDEV_") {
				upperKey = "DOCKDEV_" + upperKey
			}
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", upperKey, v))
		}

		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		cmd.Dir = utils.GetProjectConfigDir(projectName)

		if err := cmd.Run(); err != nil {
			errs = append(errs, fmt.Sprintf("plugin %s failed: %v", p.Name, err))
			utils.PrintError("Plugin %s hook %s failed: %v", p.Name, hook, err)
		} else {
			utils.PrintSuccess("Plugin %s hook %s completed", p.Name, hook)
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("%s", strings.Join(errs, "; "))
	}
	return nil
}

func (pm *Manager) hasHook(plugin *Plugin, hook HookType) bool {
	for _, h := range plugin.Hooks {
		if h == hook {
			return true
		}
	}
	return false
}

func (pm *Manager) ListPlugins() []*Plugin {
	var plugins []*Plugin
	for _, p := range pm.plugins {
		plugins = append(plugins, p)
	}
	return plugins
}

func (pm *Manager) InstallPlugin(projectName, pluginPath string) error {
	pluginsDir := filepath.Join(utils.GetProjectConfigDir(projectName), "plugins")
	if err := utils.EnsureDir(pluginsDir); err != nil {
		return err
	}

	src, err := os.ReadFile(pluginPath)
	if err != nil {
		return err
	}

	dest := filepath.Join(pluginsDir, filepath.Base(pluginPath))
	if err := os.WriteFile(dest, src, 0755); err != nil {
		return err
	}

	plugin, err := pm.loadPlugin(dest)
	if err != nil {
		return err
	}

	pm.plugins[plugin.Name] = plugin
	return nil
}

func (pm *Manager) UninstallPlugin(projectName, pluginName string) error {
	plugin, ok := pm.plugins[pluginName]
	if !ok {
		return fmt.Errorf("plugin not found: %s", pluginName)
	}

	if err := os.Remove(plugin.Path); err != nil {
		return err
	}

	delete(pm.plugins, pluginName)
	return nil
}

func (pm *Manager) CreatePlugin(projectName, name string, hooks []HookType, content string) error {
	pluginsDir := filepath.Join(utils.GetProjectConfigDir(projectName), "plugins")
	if err := utils.EnsureDir(pluginsDir); err != nil {
		return err
	}

	var hookStrs []string
	for _, h := range hooks {
		hookStrs = append(hookStrs, string(h))
	}

	header := fmt.Sprintf("#!/bin/sh\n# dockdev-plugin: name=%s, description=Auto-generated plugin, hooks=%s\n\n",
		name, strings.Join(hookStrs, "|"))

	pluginPath := filepath.Join(pluginsDir, fmt.Sprintf("%s.sh", name))
	if err := os.WriteFile(pluginPath, []byte(header+content), 0755); err != nil {
		return err
	}

	plugin, err := pm.loadPlugin(pluginPath)
	if err != nil {
		return err
	}

	pm.plugins[plugin.Name] = plugin
	return nil
}
