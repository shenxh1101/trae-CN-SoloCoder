package cli

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/cobra"

	"dockdev/internal/config"
	"dockdev/internal/env"
	"dockdev/internal/plugin"
	"dockdev/internal/port"
	"dockdev/internal/template"
	"dockdev/pkg/utils"
)

var (
	templateName string
	projectPath  string
	envType      string
	nodeVersion  string
	pythonVersion string
	goVersion    string
	javaVersion  string
)

var initCmd = &cobra.Command{
	Use:   "init [project-name]",
	Short: "Initialize a new project with a Docker environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		if projectPath == "" {
			projectPath = filepath.Join(".", projectName)
		}
		projectPath = utils.ExpandPath(projectPath)

		if _, err := config.LoadProjectConfig(projectName, envType); err == nil {
			return fmt.Errorf("project already exists: %s", projectName)
		}

		pluginMgr := plugin.NewManager()
		pluginMgr.LoadPlugins(projectName)
		envVars := map[string]string{
			"PROJECT_NAME": projectName,
			"PROJECT_PATH": projectPath,
			"TEMPLATE":     templateName,
			"ENVIRONMENT":  envType,
		}
		if err := pluginMgr.ExecuteHook(plugin.HookPreInit, projectName, envVars); err != nil {
			utils.PrintWarning("Pre-init hook failed: %v", err)
		}

		tmpl, err := template.GetTemplate(templateName)
		if err != nil {
			return err
		}

		utils.PrintInfo("Initializing %s project: %s", templateName, projectName)

		pm := port.NewPortManager()
		ports := make(map[string]int)

		for service, defaultPort := range tmpl.DefaultPorts {
			availablePorts := port.GetDefaultPorts(service)
			if len(availablePorts) == 0 {
				availablePorts = []int{defaultPort, defaultPort + 1, defaultPort + 2}
			}

			assignedPort, err := pm.FindAvailablePortFromList(availablePorts)
			if err != nil {
				assignedPort, err = pm.FindAvailablePort(defaultPort, defaultPort+100)
				if err != nil {
					return fmt.Errorf("failed to find port for %s: %w", service, err)
				}
			}
			ports[service] = assignedPort
			utils.PrintInfo("Assigned port %d for %s service", assignedPort, service)
		}

		templateData := template.TemplateData{
			ProjectName:   projectName,
			AppPort:       ports["app"],
			DbPort:        ports["db"],
			CachePort:     ports["cache"],
			NodeVersion:   nodeVersion,
			PythonVersion: pythonVersion,
			GoVersion:     goVersion,
			JavaVersion:   javaVersion,
		}

		if err := utils.EnsureDir(projectPath); err != nil {
			return err
		}

		if err := template.Render(templateName, projectPath, templateData); err != nil {
			return err
		}

		projectConfig := &config.ProjectConfig{
			Name:        projectName,
			Template:    templateName,
			Environment: config.Environment(envType),
			Path:        projectPath,
			Ports:       ports,
			Services: []config.ServiceConfig{
				{
					Name:  "app",
					Ports: []string{fmt.Sprintf("%d:%d", ports["app"], ports["app"])},
				},
				{
					Name:  "db",
					Ports: []string{fmt.Sprintf("%d:5432", ports["db"])},
				},
				{
					Name:  "cache",
					Ports: []string{fmt.Sprintf("%d:6379", ports["cache"])},
				},
			},
			Backup: config.BackupConfig{
				Enabled:       true,
				Schedule:      "0 2 * * *",
				Directory:     filepath.Join(utils.GetBackupsDir(), projectName),
				RetentionDays: 7,
				Databases: []config.DatabaseConfig{
					{
						Container: fmt.Sprintf("%s-db-1", projectName),
						Type:      "postgres",
						User:      "app",
						Password:  "password",
						Database:  "app",
					},
				},
			},
		}

		if err := config.SaveProjectConfig(projectName, projectConfig, envType); err != nil {
			return err
		}

		defaultEnv := map[string]string{
			"APP_PORT":     fmt.Sprintf("%d", ports["app"]),
			"DB_PORT":      fmt.Sprintf("%d", ports["db"]),
			"CACHE_PORT":   fmt.Sprintf("%d", ports["cache"]),
			"DB_HOST":      "db",
			"CACHE_HOST":   "cache",
			"ENVIRONMENT":  envType,
		}
		if err := env.CreateEnv(projectName, "default", defaultEnv); err != nil {
			return err
		}
		if err := env.SwitchEnv(projectName, "default"); err != nil {
			return err
		}

		if err := pluginMgr.ExecuteHook(plugin.HookPostInit, projectName, envVars); err != nil {
			utils.PrintWarning("Post-init hook failed: %v", err)
		}

		utils.PrintSuccess("Project initialized successfully!")
		fmt.Printf("\nProject: %s\n", utils.Bold(projectName))
		fmt.Printf("Template: %s\n", utils.Bold(templateName))
		fmt.Printf("Path: %s\n", utils.Bold(projectPath))
		fmt.Printf("\nNext steps:\n")
		fmt.Printf("  1. cd %s\n", projectPath)
		fmt.Printf("  2. dockdev start %s\n", projectName)
		fmt.Printf("  3. dockdev logs %s\n", projectName)

		return nil
	},
}

func init() {
	initCmd.Flags().StringVarP(&templateName, "template", "t", "nodejs", "Project template (nodejs, python, go, java)")
	initCmd.Flags().StringVarP(&projectPath, "path", "p", "", "Project path (default: ./<project-name>)")
	initCmd.Flags().StringVarP(&envType, "env", "e", "development", "Environment type (development, testing, production)")
	initCmd.Flags().StringVar(&nodeVersion, "node-version", "20", "Node.js version")
	initCmd.Flags().StringVar(&pythonVersion, "python-version", "3.11", "Python version")
	initCmd.Flags().StringVar(&goVersion, "go-version", "1.22", "Go version")
	initCmd.Flags().StringVar(&javaVersion, "java-version", "17", "Java version")

	rootCmd.AddCommand(initCmd)
}
