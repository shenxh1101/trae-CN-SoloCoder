package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
	"dockdev/pkg/utils"
)

type Environment string

const (
	EnvDevelopment Environment = "development"
	EnvTesting     Environment = "testing"
	EnvProduction  Environment = "production"
)

type ProjectConfig struct {
	Name        string            `mapstructure:"name"`
	Template    string            `mapstructure:"template"`
	Environment Environment       `mapstructure:"environment"`
	Path        string            `mapstructure:"path"`
	Ports       map[string]int    `mapstructure:"ports"`
	EnvFile     string            `mapstructure:"env_file"`
	Services    []ServiceConfig   `mapstructure:"services"`
	Backup      BackupConfig      `mapstructure:"backup"`
	Plugins     []PluginConfig    `mapstructure:"plugins"`
}

type ServiceConfig struct {
	Name       string            `mapstructure:"name"`
	Image      string            `mapstructure:"image"`
	Ports      []string          `mapstructure:"ports"`
	Volumes    []string          `mapstructure:"volumes"`
	Environment map[string]string `mapstructure:"environment"`
	Command    string            `mapstructure:"command"`
	DependsOn  []string          `mapstructure:"depends_on"`
	HealthCheck *HealthCheckConfig `mapstructure:"healthcheck"`
}

type HealthCheckConfig struct {
	Test     []string `mapstructure:"test"`
	Interval string   `mapstructure:"interval"`
	Timeout  string   `mapstructure:"timeout"`
	Retries  int      `mapstructure:"retries"`
}

type BackupConfig struct {
	Enabled      bool   `mapstructure:"enabled"`
	Schedule     string `mapstructure:"schedule"`
	Directory    string `mapstructure:"directory"`
	RetentionDays int   `mapstructure:"retention_days"`
	Databases    []DatabaseConfig `mapstructure:"databases"`
}

type DatabaseConfig struct {
	Container string `mapstructure:"container"`
	Type      string `mapstructure:"type"`
	User      string `mapstructure:"user"`
	Password  string `mapstructure:"password"`
	Database  string `mapstructure:"database"`
}

type PluginConfig struct {
	Name string   `mapstructure:"name"`
	Path string   `mapstructure:"path"`
	Hooks []string `mapstructure:"hooks"`
}

type GlobalConfig struct {
	DefaultEnvironment Environment `mapstructure:"default_environment"`
	AutoUpdate         bool        `mapstructure:"auto_update"`
	LogLevel           string      `mapstructure:"log_level"`
	PortRangeStart     int         `mapstructure:"port_range_start"`
	PortRangeEnd       int         `mapstructure:"port_range_end"`
}

var (
	globalViper   *viper.Viper
	projectViper  *viper.Viper
	Global        GlobalConfig
	CurrentProject ProjectConfig
)

func Init() error {
	configDir := utils.GetDockdevHome()
	configFile := filepath.Join(configDir, "config.yaml")

	globalViper = viper.New()
	globalViper.SetConfigFile(configFile)
	globalViper.SetConfigType("yaml")

	globalViper.SetDefault("default_environment", EnvDevelopment)
	globalViper.SetDefault("auto_update", false)
	globalViper.SetDefault("log_level", "info")
	globalViper.SetDefault("port_range_start", 3000)
	globalViper.SetDefault("port_range_end", 9000)

	if !utils.FileExists(configFile) {
		defaultConfig := `default_environment: development
auto_update: false
log_level: info
port_range_start: 3000
port_range_end: 9000
`
		if err := os.WriteFile(configFile, []byte(defaultConfig), 0644); err != nil {
			return err
		}
	}

	if err := globalViper.ReadInConfig(); err != nil {
		return err
	}

	if err := globalViper.Unmarshal(&Global); err != nil {
		return err
	}

	return nil
}

func LoadProjectConfig(projectName, env string) (*ProjectConfig, error) {
	projectDir := utils.GetProjectConfigDir(projectName)
	configFile := filepath.Join(projectDir, fmt.Sprintf("config.%s.yaml", env))

	if !utils.FileExists(configFile) {
		return nil, fmt.Errorf("project config not found: %s", configFile)
	}

	projectViper = viper.New()
	projectViper.SetConfigFile(configFile)
	projectViper.SetConfigType("yaml")

	if err := projectViper.ReadInConfig(); err != nil {
		return nil, err
	}

	var config ProjectConfig
	if err := projectViper.Unmarshal(&config); err != nil {
		return nil, err
	}

	config.Environment = Environment(env)
	CurrentProject = config

	return &config, nil
}

func SaveProjectConfig(projectName string, config *ProjectConfig, env string) error {
	projectDir := utils.GetProjectConfigDir(projectName)
	configFile := filepath.Join(projectDir, fmt.Sprintf("config.%s.yaml", env))

	projectViper = viper.New()
	projectViper.SetConfigFile(configFile)
	projectViper.SetConfigType("yaml")

	projectViper.Set("name", config.Name)
	projectViper.Set("template", config.Template)
	projectViper.Set("path", config.Path)
	projectViper.Set("ports", config.Ports)
	projectViper.Set("env_file", config.EnvFile)
	projectViper.Set("services", config.Services)
	projectViper.Set("backup", config.Backup)
	projectViper.Set("plugins", config.Plugins)

	return projectViper.WriteConfigAs(configFile)
}

func ListProjects() ([]string, error) {
	projectsDir := utils.GetProjectsDir()
	entries, err := filepath.Glob(filepath.Join(projectsDir, "*"))
	if err != nil {
		return nil, err
	}

	var projects []string
	for _, entry := range entries {
		projects = append(projects, filepath.Base(entry))
	}
	return projects, nil
}

func DeleteProject(projectName string) error {
	projectDir := utils.GetProjectConfigDir(projectName)
	return utils.DeleteFile(projectDir)
}
