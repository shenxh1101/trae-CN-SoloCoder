package cli

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"

	"dockdev/internal/env"
	"dockdev/pkg/utils"
)

var envCmd = &cobra.Command{
	Use:   "env",
	Short: "Manage environment variable configurations",
}

var envListCmd = &cobra.Command{
	Use:   "list [project-name]",
	Short: "List all environment configurations",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envs, err := env.ListEnvs(projectName)
		if err != nil {
			return err
		}

		if len(envs) == 0 {
			utils.PrintWarning("No environment configurations found")
			return nil
		}

		for _, e := range envs {
			marker := "  "
			if e.IsActive {
				marker = utils.Green("* ")
			}
			fmt.Printf("%s%s\n", marker, e.Name)
		}

		return nil
	},
}

var envShowCmd = &cobra.Command{
	Use:   "show [project-name] [env-name]",
	Short: "Show environment variables",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envName := ""
		if len(args) > 1 {
			envName = args[1]
		}

		var vars map[string]string
		var err error

		if envName == "" {
			vars, err = env.LoadEnv(projectName)
		} else {
			vars, err = env.LoadEnvByName(projectName, envName)
		}

		if err != nil {
			return err
		}

		for k, v := range vars {
			fmt.Printf("%s=%s\n", k, v)
		}

		return nil
	},
}

var envCreateCmd = &cobra.Command{
	Use:   "create [project-name] [env-name]",
	Short: "Create a new environment configuration",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envName := args[1]

		vars := make(map[string]string)
		for _, e := range os.Environ() {
			kv := strings.SplitN(e, "=", 2)
			if len(kv) == 2 && strings.HasPrefix(kv[0], "DOCKDEV_") {
				vars[strings.TrimPrefix(kv[0], "DOCKDEV_")] = kv[1]
			}
		}

		return env.CreateEnv(projectName, envName, vars)
	},
}

var envSwitchCmd = &cobra.Command{
	Use:   "switch [project-name] [env-name]",
	Short: "Switch to a different environment",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envName := args[1]

		if err := env.SwitchEnv(projectName, envName); err != nil {
			return err
		}

		utils.PrintSuccess("Switched to environment: %s", envName)
		return nil
	},
}

var envSetCmd = &cobra.Command{
	Use:   "set [project-name] [env-name] [key] [value]",
	Short: "Set an environment variable",
	Args:  cobra.ExactArgs(4),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envName := args[1]
		key := args[2]
		value := args[3]

		if err := env.UpdateEnv(projectName, envName, map[string]string{key: value}); err != nil {
			return err
		}

		utils.PrintSuccess("Set %s=%s in %s", key, value, envName)
		return nil
	},
}

var envDeleteCmd = &cobra.Command{
	Use:   "delete [project-name] [env-name]",
	Short: "Delete an environment configuration",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		envName := args[1]

		return env.DeleteEnv(projectName, envName)
	},
}

func init() {
	envCmd.AddCommand(envListCmd)
	envCmd.AddCommand(envShowCmd)
	envCmd.AddCommand(envCreateCmd)
	envCmd.AddCommand(envSwitchCmd)
	envCmd.AddCommand(envSetCmd)
	envCmd.AddCommand(envDeleteCmd)

	rootCmd.AddCommand(envCmd)
}
