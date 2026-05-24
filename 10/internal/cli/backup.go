package cli

import (
	"fmt"

	"github.com/spf13/cobra"

	"dockdev/internal/backup"
	"dockdev/internal/config"
	docker "dockdev/internal/docker"
	"dockdev/pkg/utils"
)

var (
	restoreDB string
)

var backupCmd = &cobra.Command{
	Use:   "backup",
	Short: "Manage database backups",
}

var backupCreateCmd = &cobra.Command{
	Use:   "create [project-name]",
	Short: "Create an immediate backup",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		backupMgr := backup.NewBackupManager(dockerMgr)

		results, err := backupMgr.BackupNow(projectName)
		if err != nil {
			return err
		}

		for _, r := range results {
			if r.Error != nil {
				utils.PrintError("Backup failed for %s: %v", r.Container, r.Error)
			} else {
				utils.PrintSuccess("Backup created: %s", r.File)
			}
		}

		return nil
	},
}

var backupListCmd = &cobra.Command{
	Use:   "list [project-name]",
	Short: "List all backups",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		backupMgr := backup.NewBackupManager(dockerMgr)

		backups, err := backupMgr.ListBackups(projectName)
		if err != nil {
			return err
		}

		if len(backups) == 0 {
			utils.PrintWarning("No backups found")
			return nil
		}

		for _, b := range backups {
			fmt.Println(b)
		}

		return nil
	},
}

var backupRestoreCmd = &cobra.Command{
	Use:   "restore [project-name] [backup-file]",
	Short: "Restore from a backup",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		backupFile := args[1]

		projectCfg, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment))
		if err != nil {
			return err
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		backupMgr := backup.NewBackupManager(dockerMgr)

		for _, db := range projectCfg.Backup.Databases {
			if restoreDB != "" && db.Container != restoreDB {
				continue
			}
			if err := backupMgr.Restore(projectName, backupFile, db); err != nil {
				return err
			}
			utils.PrintSuccess("Restored %s from %s", db.Container, backupFile)
		}

		return nil
	},
}

func init() {
	backupRestoreCmd.Flags().StringVar(&restoreDB, "database", "", "Restore only specific database container")

	backupCmd.AddCommand(backupCreateCmd)
	backupCmd.AddCommand(backupListCmd)
	backupCmd.AddCommand(backupRestoreCmd)

	rootCmd.AddCommand(backupCmd)
}
