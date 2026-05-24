package utils

import (
	"fmt"
	"os"
	"path/filepath"
)

func ExpandPath(path string) string {
	if len(path) == 0 {
		return path
	}
	if path[0] == '~' {
		home, err := os.UserHomeDir()
		if err == nil {
			path = filepath.Join(home, path[1:])
		}
	}
	return path
}

func EnsureDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
}

func FileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

func GetDockdevHome() string {
	home := os.Getenv("DOCKDEV_HOME")
	if home == "" {
		home = filepath.Join(os.Getenv("HOME"), ".dockdev")
	}
	EnsureDir(home)
	return home
}

func GetProjectsDir() string {
	dir := filepath.Join(GetDockdevHome(), "projects")
	EnsureDir(dir)
	return dir
}

func GetEnvsDir() string {
	dir := filepath.Join(GetDockdevHome(), "envs")
	EnsureDir(dir)
	return dir
}

func GetBackupsDir() string {
	dir := filepath.Join(GetDockdevHome(), "backups")
	EnsureDir(dir)
	return dir
}

func GetSnapshotsDir() string {
	dir := filepath.Join(GetDockdevHome(), "snapshots")
	EnsureDir(dir)
	return dir
}

func GetPluginsDir() string {
	dir := filepath.Join(GetDockdevHome(), "plugins")
	EnsureDir(dir)
	return dir
}

func GetProjectConfigDir(projectName string) string {
	dir := filepath.Join(GetProjectsDir(), projectName)
	EnsureDir(dir)
	return dir
}

func PrintSuccess(format string, a ...interface{}) {
	fmt.Printf("%s %s\n", Green("✓"), fmt.Sprintf(format, a...))
}

func PrintError(format string, a ...interface{}) {
	fmt.Fprintf(os.Stderr, "%s %s\n", Red("✗"), fmt.Sprintf(format, a...))
}

func PrintWarning(format string, a ...interface{}) {
	fmt.Printf("%s %s\n", Yellow("⚠"), fmt.Sprintf(format, a...))
}

func PrintInfo(format string, a ...interface{}) {
	fmt.Printf("%s %s\n", Blue("ℹ"), fmt.Sprintf(format, a...))
}

func DeleteFile(path string) error {
	return os.RemoveAll(path)
}
