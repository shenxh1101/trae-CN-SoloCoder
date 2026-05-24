package env

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	"dockdev/pkg/utils"
)

type EnvConfig struct {
	Name    string
	Path    string
	IsActive bool
}

func ListEnvs(projectName string) ([]EnvConfig, error) {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	if err := utils.EnsureDir(envDir); err != nil {
		return nil, err
	}

	activeEnv, err := getActiveEnv(projectName)
	if err != nil {
		activeEnv = ""
	}

	files, err := filepath.Glob(filepath.Join(envDir, "*.env"))
	if err != nil {
		return nil, err
	}

	var configs []EnvConfig
	for _, file := range files {
		name := strings.TrimSuffix(filepath.Base(file), ".env")
		configs = append(configs, EnvConfig{
			Name:    name,
			Path:    file,
			IsActive: name == activeEnv,
		})
	}

	sort.Slice(configs, func(i, j int) bool {
		if configs[i].IsActive != configs[j].IsActive {
			return configs[i].IsActive
		}
		return configs[i].Name < configs[j].Name
	})

	return configs, nil
}

func CreateEnv(projectName, envName string, vars map[string]string) error {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	if err := utils.EnsureDir(envDir); err != nil {
		return err
	}

	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))
	if utils.FileExists(envPath) {
		return fmt.Errorf("env already exists: %s", envName)
	}

	return godotenv.Write(vars, envPath)
}

func DeleteEnv(projectName, envName string) error {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return fmt.Errorf("env not found: %s", envName)
	}

	activeEnv, _ := getActiveEnv(projectName)
	if activeEnv == envName {
		return fmt.Errorf("cannot delete active env, switch to another env first")
	}

	return os.Remove(envPath)
}

func SwitchEnv(projectName, envName string) error {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return fmt.Errorf("env not found: %s", envName)
	}

	activeFile := filepath.Join(utils.GetProjectConfigDir(projectName), ".active_env")
	return os.WriteFile(activeFile, []byte(envName), 0644)
}

func GetActiveEnv(projectName string) (string, error) {
	return getActiveEnv(projectName)
}

func getActiveEnv(projectName string) (string, error) {
	activeFile := filepath.Join(utils.GetProjectConfigDir(projectName), ".active_env")
	if !utils.FileExists(activeFile) {
		return "", fmt.Errorf("no active env set")
	}

	data, err := os.ReadFile(activeFile)
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(string(data)), nil
}

func GetActiveEnvPath(projectName string) (string, error) {
	envName, err := getActiveEnv(projectName)
	if err != nil {
		return "", err
	}

	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return "", fmt.Errorf("active env file not found: %s", envPath)
	}

	return envPath, nil
}

func LoadEnv(projectName string) (map[string]string, error) {
	envPath, err := GetActiveEnvPath(projectName)
	if err != nil {
		return nil, err
	}
	return godotenv.Read(envPath)
}

func LoadEnvByName(projectName, envName string) (map[string]string, error) {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return nil, fmt.Errorf("env not found: %s", envName)
	}

	return godotenv.Read(envPath)
}

func UpdateEnv(projectName, envName string, vars map[string]string) error {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return fmt.Errorf("env not found: %s", envName)
	}

	existing, err := godotenv.Read(envPath)
	if err != nil {
		return err
	}

	for k, v := range vars {
		existing[k] = v
	}

	return godotenv.Write(existing, envPath)
}

func RemoveEnvVar(projectName, envName, key string) error {
	envDir := filepath.Join(utils.GetProjectConfigDir(projectName), "envs")
	envPath := filepath.Join(envDir, fmt.Sprintf("%s.env", envName))

	if !utils.FileExists(envPath) {
		return fmt.Errorf("env not found: %s", envName)
	}

	existing, err := godotenv.Read(envPath)
	if err != nil {
		return err
	}

	delete(existing, key)

	return godotenv.Write(existing, envPath)
}
