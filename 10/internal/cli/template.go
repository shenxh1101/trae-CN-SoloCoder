package cli

import (
	"fmt"
	"os"

	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"

	"dockdev/internal/plugin"
	"dockdev/internal/template"
	"dockdev/pkg/utils"
)

var templateCmd = &cobra.Command{
	Use:   "template",
	Short: "List available project templates",
	RunE: func(cmd *cobra.Command, args []string) error {
		templates := template.ListTemplates()

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader([]string{"Name", "Description", "Default Ports"})

		for _, t := range templates {
			ports := ""
			i := 0
			for svc, port := range t.DefaultPorts {
				if i > 0 {
					ports += ", "
				}
				ports += fmt.Sprintf("%s:%d", svc, port)
				i++
			}
			table.Append([]string{t.Name, t.Description, ports})
		}

		table.Render()
		return nil
	},
}

var pluginCmd = &cobra.Command{
	Use:   "plugin",
	Short: "Manage plugins",
}

var pluginListCmd = &cobra.Command{
	Use:   "list [project-name]",
	Short: "List installed plugins",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			return err
		}

		plugins := pluginMgr.ListPlugins()
		if len(plugins) == 0 {
			utils.PrintWarning("No plugins installed")
			return nil
		}

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader([]string{"Name", "Description", "Hooks"})

		for _, p := range plugins {
			hooks := ""
			for i, h := range p.Hooks {
				if i > 0 {
					hooks += ", "
				}
				hooks += string(h)
			}
			table.Append([]string{p.Name, p.Description, hooks})
		}

		table.Render()
		return nil
	},
}

var pluginInstallCmd = &cobra.Command{
	Use:   "install [project-name] [plugin-path]",
	Short: "Install a plugin",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		pluginPath := args[1]

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.InstallPlugin(projectName, pluginPath); err != nil {
			return err
		}

		utils.PrintSuccess("Plugin installed successfully")
		return nil
	},
}

var pluginUninstallCmd = &cobra.Command{
	Use:   "uninstall [project-name] [plugin-name]",
	Short: "Uninstall a plugin",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		pluginName := args[1]

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			return err
		}

		if err := pluginMgr.UninstallPlugin(projectName, pluginName); err != nil {
			return err
		}

		utils.PrintSuccess("Plugin uninstalled: %s", pluginName)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(templateCmd)

	pluginCmd.AddCommand(pluginListCmd)
	pluginCmd.AddCommand(pluginInstallCmd)
	pluginCmd.AddCommand(pluginUninstallCmd)

	rootCmd.AddCommand(pluginCmd)
}
