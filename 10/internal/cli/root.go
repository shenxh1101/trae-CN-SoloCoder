package cli

import (
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "dockdev",
	Short: "DockDev - Docker development environment manager",
	Long: `DockDev is a command-line tool for managing Docker-based development environments.
It provides one-click setup for various project templates, automatic port assignment,
environment variable management, log aggregation, health monitoring, and more.`,
	Version: "1.0.0",
	SilenceUsage: true,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = false
	rootCmd.SetHelpCommand(&cobra.Command{Hidden: false})
}

func NewRootCmd() *cobra.Command {
	return rootCmd
}
