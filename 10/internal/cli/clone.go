package cli

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"dockdev/internal/config"
	"dockdev/internal/env"
	"dockdev/internal/git"
	"dockdev/internal/plugin"
	"dockdev/internal/port"
	"dockdev/internal/template"
	"dockdev/pkg/utils"
)

var (
	cloneBranch         string
	cloneTag            string
	cloneDepth          int
	cloneTemplate       string
	cloneToken          string
	cloneSSHKeyPath     string
	cloneSSHPassphrase  string
	cloneInsecure       bool
	cloneRecurseSubmodules bool
)

var cloneCmd = &cobra.Command{
	Use:   "clone [git-url] [project-name]",
	Short: "Clone a Git repository and configure Docker environment",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		gitURL := args[0]
		projectName := ""
		if len(args) > 1 {
			projectName = args[1]
		} else {
			projectName = deriveProjectName(gitURL)
		}

		projectPath := filepath.Join(".", projectName)
		projectPath = utils.ExpandPath(projectPath)

		if _, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment)); err == nil {
			return fmt.Errorf("project already exists: %s", projectName)
		}

		utils.PrintInfo("Cloning repository: %s", gitURL)

		cloneOpts := git.CloneOptions{
			URL:               gitURL,
			TargetDir:         projectPath,
			Branch:            cloneBranch,
			Tag:               cloneTag,
			Depth:             cloneDepth,
			Token:             cloneToken,
			SSHKeyPath:        cloneSSHKeyPath,
			SSHPassphrase:     cloneSSHPassphrase,
			InsecureSkipTLS:   cloneInsecure,
			RecurseSubmodules: cloneRecurseSubmodules,
		}

		pluginMgr := plugin.NewManager()
		envVars := make(map[string]string)
		if err := pluginMgr.ExecuteHook(plugin.HookPreClone, projectName, envVars); err != nil {
			utils.PrintWarning("Pre-clone hook failed: %v", err)
		}

		if err := git.Clone(cloneOpts); err != nil {
			return err
		}

		repoInfo, err := git.GetRepoInfo(projectPath)
		if err != nil {
			utils.PrintWarning("Failed to get repository info: %v", err)
		} else {
			utils.PrintInfo("Repository: %s", repoInfo.URL)
			utils.PrintInfo("Commit: %s", repoInfo.Commit[:12])
			utils.PrintInfo("Author: %s", repoInfo.Author)
		}

		utils.PrintSuccess("Repository cloned successfully")

		if cloneTemplate == "" {
			detector := git.DetectLanguage(projectPath)
			cloneTemplate = detector.Primary
			if detector.Confidence < 0.5 {
				utils.PrintWarning("Low confidence (%d%%) in language detection, using %s",
					int(detector.Confidence*100), cloneTemplate)
			} else {
				utils.PrintInfo("Detected project type: %s (confidence: %d%%)",
					cloneTemplate, int(detector.Confidence*100))
			}
			if len(detector.Secondary) > 0 {
				utils.PrintInfo("Secondary languages: %v", detector.Secondary)
			}
		}

		tmpl, err := template.GetTemplate(cloneTemplate)
		if err != nil {
			return err
		}

		pm := port.NewPortManager()
		ports := make(map[string]int)

		for service, defaultPort := range tmpl.DefaultPorts {
			availablePorts := port.GetDefaultPorts(service)
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

		if err := template.Render(cloneTemplate, projectPath, templateData); err != nil {
			return err
		}

		if err := pluginMgr.LoadPlugins(projectName); err != nil {
			utils.PrintWarning("Failed to load plugins: %v", err)
		}
		if err := pluginMgr.ExecuteHook(plugin.HookPostClone, projectName, envVars); err != nil {
			utils.PrintWarning("Post-clone hook failed: %v", err)
		}

		projectConfig := &config.ProjectConfig{
			Name:        projectName,
			Template:    cloneTemplate,
			Environment: config.EnvDevelopment,
			Path:        projectPath,
			Ports:       ports,
		}

		if err := config.SaveProjectConfig(projectName, projectConfig, string(config.EnvDevelopment)); err != nil {
			return err
		}

		defaultEnv := map[string]string{
			"APP_PORT":   fmt.Sprintf("%d", ports["app"]),
			"DB_PORT":    fmt.Sprintf("%d", ports["db"]),
			"CACHE_PORT": fmt.Sprintf("%d", ports["cache"]),
			"GIT_URL":    gitURL,
		}
		if err := env.CreateEnv(projectName, "default", defaultEnv); err != nil {
			return err
		}
		if err := env.SwitchEnv(projectName, "default"); err != nil {
			return err
		}

		utils.PrintSuccess("Project cloned and configured successfully!")
		fmt.Printf("\nNext steps:\n")
		fmt.Printf("  1. cd %s\n", projectPath)
		fmt.Printf("  2. dockdev start %s\n", projectName)

		return nil
	},
}

func deriveProjectName(gitURL string) string {
	name := filepath.Base(gitURL)
	name = strings.TrimSuffix(name, ".git")
	return name
}

func init() {
	cloneCmd.Flags().StringVarP(&cloneBranch, "branch", "b", "", "Branch to clone")
	cloneCmd.Flags().StringVar(&cloneTag, "tag", "", "Tag to clone")
	cloneCmd.Flags().IntVarP(&cloneDepth, "depth", "d", 0, "Create a shallow clone with a history truncated to the specified number of commits")
	cloneCmd.Flags().StringVarP(&cloneTemplate, "template", "t", "", "Force project template type")
	cloneCmd.Flags().StringVar(&cloneToken, "token", os.Getenv("GITHUB_TOKEN"), "Git authentication token")
	cloneCmd.Flags().StringVar(&cloneSSHKeyPath, "ssh-key", "", "Path to SSH private key")
	cloneCmd.Flags().StringVar(&cloneSSHPassphrase, "ssh-passphrase", "", "SSH key passphrase")
	cloneCmd.Flags().BoolVar(&cloneInsecure, "insecure", false, "Skip TLS certificate verification")
	cloneCmd.Flags().BoolVar(&cloneRecurseSubmodules, "recurse-submodules", false, "Initialize and clone submodules")
	cloneCmd.Flags().StringVar(&nodeVersion, "node-version", "20", "Node.js version")
	cloneCmd.Flags().StringVar(&pythonVersion, "python-version", "3.11", "Python version")
	cloneCmd.Flags().StringVar(&goVersion, "go-version", "1.22", "Go version")
	cloneCmd.Flags().StringVar(&javaVersion, "java-version", "17", "Java version")

	rootCmd.AddCommand(cloneCmd)
}
