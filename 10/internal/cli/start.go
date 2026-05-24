package cli

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"dockdev/internal/backup"
	"dockdev/internal/config"
	docker "dockdev/internal/docker"
	"dockdev/internal/env"
	"dockdev/internal/plugin"
	"dockdev/pkg/utils"
)

var (
	buildFirst bool
	noDeps     bool
)

var startCmd = &cobra.Command{
	Use:   "start [project-name]",
	Short: "Start a project's Docker environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		projectCfg, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment))
		if err != nil {
			return err
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			utils.PrintWarning("Failed to load plugins: %v", err)
		}

		envVars, err := env.LoadEnv(projectName)
		if err != nil {
			envVars = make(map[string]string)
		}

		if err := pluginMgr.ExecuteHook(plugin.HookPreStart, projectName, envVars); err != nil {
			return err
		}

		if buildFirst {
			utils.PrintInfo("Building images for project: %s", projectName)
			if err := pluginMgr.ExecuteHook(plugin.HookPreBuild, projectName, envVars); err != nil {
				return err
			}
			if err := dockerMgr.ComposeBuild(projectCfg.Path, projectName); err != nil {
				return err
			}
			if err := pluginMgr.ExecuteHook(plugin.HookPostBuild, projectName, envVars); err != nil {
				return err
			}
		}

		envFile, _ := env.GetActiveEnvPath(projectName)

		utils.PrintInfo("Starting project: %s", projectName)
		if err := dockerMgr.ComposeUp(projectCfg.Path, projectName, envFile); err != nil {
			return err
		}

		if err := pluginMgr.ExecuteHook(plugin.HookPostStart, projectName, envVars); err != nil {
			return err
		}

		if projectCfg.Backup.Enabled {
			backupMgr := backup.NewBackupManager(dockerMgr)
			if err := backupMgr.ScheduleBackup(projectName, projectCfg.Backup); err != nil {
				utils.PrintWarning("Failed to schedule backup: %v", err)
			} else {
				backupMgr.Start()
				utils.PrintInfo("Scheduled backups enabled")
			}
		}

		utils.PrintSuccess("Project started successfully!")
		return nil
	},
}

var stopCmd = &cobra.Command{
	Use:   "stop [project-name]",
	Short: "Stop a project's Docker environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		projectCfg, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment))
		if err != nil {
			return err
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			utils.PrintWarning("Failed to load plugins: %v", err)
		}

		envVars, _ := env.LoadEnv(projectName)

		if err := pluginMgr.ExecuteHook(plugin.HookPreStop, projectName, envVars); err != nil {
			return err
		}

		utils.PrintInfo("Stopping project: %s", projectName)
		if err := dockerMgr.ComposeDown(projectCfg.Path, projectName); err != nil {
			return err
		}

		if err := pluginMgr.ExecuteHook(plugin.HookPostStop, projectName, envVars); err != nil {
			return err
		}

		utils.PrintSuccess("Project stopped successfully!")
		return nil
	},
}

var restartCmd = &cobra.Command{
	Use:   "restart [project-name]",
	Short: "Restart a project's Docker environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		projectCfg, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment))
		if err != nil {
			return err
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		pluginMgr := plugin.NewManager()
		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			utils.PrintWarning("Failed to load plugins: %v", err)
		}

		envVars, _ := env.LoadEnv(projectName)

		if err := pluginMgr.ExecuteHook(plugin.HookPreRestart, projectName, envVars); err != nil {
			return err
		}

		utils.PrintInfo("Restarting project: %s", projectName)
		if err := dockerMgr.ComposeRestart(projectCfg.Path, projectName); err != nil {
			return err
		}

		if err := pluginMgr.ExecuteHook(plugin.HookPostRestart, projectName, envVars); err != nil {
			return err
		}

		utils.PrintSuccess("Project restarted successfully!")
		return nil
	},
}

var execCmd = &cobra.Command{
	Use:   "exec [project-name] [service] [command...]",
	Short: "Execute a command in a running container",
	Args:  cobra.MinimumNArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		service := args[1]
		command := ""
		if len(args) > 2 {
			for i, arg := range args[2:] {
				if i > 0 {
					command += " "
				}
				command += arg
			}
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		containerID, err := dockerMgr.GetContainerIDByName(service, projectName)
		if err != nil {
			return err
		}

		return dockerMgr.Exec(containerID, command, command == "")
	},
}

var shellCmd = &cobra.Command{
	Use:   "shell [project-name] [service]",
	Short: "Open an interactive shell in a container",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		service := args[1]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		containerID, err := dockerMgr.GetContainerIDByName(service, projectName)
		if err != nil {
			return err
		}

		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

		go func() {
			<-sigChan
		}()

		return dockerMgr.Exec(containerID, "", true)
	},
}

var psCmd = &cobra.Command{
	Use:   "ps [project-name]",
	Short: "List containers for a project",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := ""
		if len(args) > 0 {
			projectName = args[0]
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		containers, err := dockerMgr.ListContainers(projectName)
		if err != nil {
			return err
		}

		if len(containers) == 0 {
			utils.PrintWarning("No containers found")
			return nil
		}

		for _, c := range containers {
			status := c.Status
			if c.State == "running" {
				status = utils.Green(status)
			} else {
				status = utils.Red(status)
			}
			fmt.Printf("%-12s %-30s %s\n", c.ID, c.Name, status)
		}

		return nil
	},
}

func init() {
	startCmd.Flags().BoolVarP(&buildFirst, "build", "b", false, "Build images before starting")
	startCmd.Flags().BoolVar(&noDeps, "no-deps", false, "Don't start linked services")

	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(stopCmd)
	rootCmd.AddCommand(restartCmd)
	rootCmd.AddCommand(execCmd)
	rootCmd.AddCommand(shellCmd)
	rootCmd.AddCommand(psCmd)
}
