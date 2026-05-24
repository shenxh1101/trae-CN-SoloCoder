package backup

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/robfig/cron/v3"

	"dockdev/internal/config"
	docker "dockdev/internal/docker"
	"dockdev/internal/plugin"
	"dockdev/pkg/utils"
)

type BackupManager struct {
	dockerMgr   *docker.Manager
	cron        *cron.Cron
	jobs        map[string]cron.EntryID
	pluginMgr   *plugin.Manager
}

type BackupResult struct {
	ProjectName string
	Container   string
	DbType      string
	Timestamp   time.Time
	File        string
	Size        int64
	Error       error
}

type DatabaseType struct {
	Name            string
	ImagePatterns   []string
	BackupCommand   func(DatabaseConfig) string
	RestoreCommand  func(DatabaseConfig, string) string
	DefaultUser     string
	DefaultPassword string
	DefaultDatabase string
}

type DatabaseConfig struct {
	Container string
	Type      string
	User      string
	Password  string
	Database  string
	BackupDir string
}

var databaseTypes = []DatabaseType{
	{
		Name:          "postgres",
		ImagePatterns: []string{"postgres", "postgis", "timescaledb"},
		BackupCommand: func(c DatabaseConfig) string {
			env := ""
			if c.Password != "" {
				env = fmt.Sprintf("PGPASSWORD=%s ", c.Password)
			}
			return fmt.Sprintf("%spg_dump -h localhost -U %s -d %s -F c -b -v -f /tmp/backup.sql",
				env, c.User, c.Database)
		},
		RestoreCommand: func(c DatabaseConfig, backupPath string) string {
			env := ""
			if c.Password != "" {
				env = fmt.Sprintf("PGPASSWORD=%s ", c.Password)
			}
			return fmt.Sprintf("%spg_restore -h localhost -U %s -d %s -v %s",
				env, c.User, c.Database, backupPath)
		},
		DefaultUser:     "postgres",
		DefaultPassword: "postgres",
		DefaultDatabase: "postgres",
	},
	{
		Name:          "mysql",
		ImagePatterns: []string{"mysql", "mariadb", "percona"},
		BackupCommand: func(c DatabaseConfig) string {
			passwordFlag := ""
			if c.Password != "" {
				passwordFlag = fmt.Sprintf("-p%s", c.Password)
			}
			return fmt.Sprintf("mysqldump -h localhost -u %s %s --databases %s --routines --triggers > /tmp/backup.sql",
				c.User, passwordFlag, c.Database)
		},
		RestoreCommand: func(c DatabaseConfig, backupPath string) string {
			passwordFlag := ""
			if c.Password != "" {
				passwordFlag = fmt.Sprintf("-p%s", c.Password)
			}
			return fmt.Sprintf("mysql -h localhost -u %s %s %s < %s",
				c.User, passwordFlag, c.Database, backupPath)
		},
		DefaultUser:     "root",
		DefaultPassword: "root",
		DefaultDatabase: "mysql",
	},
	{
		Name:          "mongodb",
		ImagePatterns: []string{"mongo", "mongodb"},
		BackupCommand: func(c DatabaseConfig) string {
			auth := ""
			if c.User != "" && c.Password != "" {
				auth = fmt.Sprintf("-u %s -p %s --authenticationDatabase admin", c.User, c.Password)
			}
			return fmt.Sprintf("mongodump -h localhost %s -d %s -o /tmp/mongobackup",
				auth, c.Database)
		},
		RestoreCommand: func(c DatabaseConfig, backupPath string) string {
			auth := ""
			if c.User != "" && c.Password != "" {
				auth = fmt.Sprintf("-u %s -p %s --authenticationDatabase admin", c.User, c.Password)
			}
			return fmt.Sprintf("mongorestore -h localhost %s -d %s --drop %s/%s",
				auth, c.Database, backupPath, c.Database)
		},
		DefaultUser:     "",
		DefaultPassword: "",
		DefaultDatabase: "test",
	},
	{
		Name:          "redis",
		ImagePatterns: []string{"redis"},
		BackupCommand: func(c DatabaseConfig) string {
			return "redis-cli --rdb /tmp/backup.rdb"
		},
		RestoreCommand: func(c DatabaseConfig, backupPath string) string {
			return fmt.Sprintf("cp %s /data/dump.rdb && redis-cli CONFIG SET dir /data && redis-cli DEBUG RELOAD", backupPath)
		},
		DefaultUser:     "",
		DefaultPassword: "",
		DefaultDatabase: "",
	},
}

func NewBackupManager(dockerMgr *docker.Manager) *BackupManager {
	return &BackupManager{
		dockerMgr: dockerMgr,
		cron:      cron.New(),
		jobs:      make(map[string]cron.EntryID),
		pluginMgr: plugin.NewManager(),
	}
}

func (bm *BackupManager) Start() {
	bm.cron.Start()
}

func (bm *BackupManager) Stop() {
	bm.cron.Stop()
}

func (bm *BackupManager) ScheduleBackup(projectName string, cfg config.BackupConfig) error {
	if !cfg.Enabled {
		return nil
	}

	schedule := cfg.Schedule
	if schedule == "" {
		schedule = "0 2 * * *"
	}

	id, err := bm.cron.AddFunc(schedule, func() {
		fmt.Printf("\n[%s] Starting scheduled backup for project: %s\n",
			time.Now().Format(time.RFC3339), projectName)

		results, err := bm.BackupNow(projectName)
		if err != nil {
			utils.PrintError("Scheduled backup failed: %v", err)
			return
		}

		for _, result := range results {
			if result.Error != nil {
				utils.PrintError("Backup failed for %s: %v", result.Container, result.Error)
			} else {
				utils.PrintSuccess("Backup completed: %s (%s)", result.File, formatSize(result.Size))
			}
		}
	})
	if err != nil {
		return fmt.Errorf("failed to schedule backup: %w", err)
	}

	bm.jobs[projectName] = id
	utils.PrintInfo("Scheduled backup for %s at %s", projectName, schedule)
	return nil
}

func (bm *BackupManager) DetectDatabases(projectName string) ([]config.DatabaseConfig, error) {
	containers, err := bm.dockerMgr.ListContainers(projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var databases []config.DatabaseConfig
	seen := make(map[string]bool)

	for _, c := range containers {
		if c.State != "running" {
			continue
		}

		dbType := detectDatabaseType(c.Image)
		if dbType == nil {
			continue
		}

		if seen[c.Name] {
			continue
		}
		seen[c.Name] = true

		config := config.DatabaseConfig{
			Container: c.Name,
			Type:      dbType.Name,
			User:      getDatabaseEnv(c.Name, "POSTGRES_USER", "MYSQL_USER", "MONGO_INITDB_ROOT_USERNAME"),
			Password:  getDatabaseEnv(c.Name, "POSTGRES_PASSWORD", "MYSQL_ROOT_PASSWORD", "MONGO_INITDB_ROOT_PASSWORD"),
			Database:  getDatabaseEnv(c.Name, "POSTGRES_DB", "MYSQL_DATABASE", "MONGO_INITDB_DATABASE"),
		}

		if config.User == "" {
			config.User = dbType.DefaultUser
		}
		if config.Password == "" {
			config.Password = dbType.DefaultPassword
		}
		if config.Database == "" {
			config.Database = dbType.DefaultDatabase
		}

		databases = append(databases, config)
		utils.PrintInfo("Detected %s database: %s", dbType.Name, c.Name)
	}

	return databases, nil
}

func detectDatabaseType(image string) *DatabaseType {
	imageLower := strings.ToLower(image)
	for i := range databaseTypes {
		for _, pattern := range databaseTypes[i].ImagePatterns {
			if strings.Contains(imageLower, pattern) {
				return &databaseTypes[i]
			}
		}
	}
	return nil
}

func getDatabaseEnv(containerName string, keys ...string) string {
	for _, key := range keys {
		cmd := fmt.Sprintf("echo $%s", key)
		output, err := dockerExecSilent(containerName, cmd)
		if err == nil {
			output = strings.TrimSpace(output)
			if output != "" {
				return output
			}
		}
	}
	return ""
}

func dockerExecSilent(containerName, command string) (string, error) {
	cli, err := docker.NewManager()
	if err != nil {
		return "", err
	}
	defer cli.Close()

	return cli.ExecDetached(containerName, command)
}

func (bm *BackupManager) BackupDatabase(projectName string, db config.DatabaseConfig, cfg config.BackupConfig) BackupResult {
	result := BackupResult{
		ProjectName: projectName,
		Container:   db.Container,
		DbType:      db.Type,
		Timestamp:   time.Now(),
	}

	dbType := detectDatabaseTypeByName(db.Type)
	if dbType == nil {
		result.Error = fmt.Errorf("unsupported database type: %s", db.Type)
		return result
	}

	timestamp := time.Now().Format("20060102_150405")
	ext := ".sql"
	if db.Type == "mongodb" {
		ext = ".archive"
	} else if db.Type == "redis" {
		ext = ".rdb"
	}
	filename := fmt.Sprintf("%s_%s_%s%s", projectName, db.Container, timestamp, ext)

	backupDir := utils.ExpandPath(cfg.Directory)
	if backupDir == "" {
		backupDir = utils.GetBackupsDir()
	}
	backupDir = filepath.Join(backupDir, projectName)
	utils.EnsureDir(backupDir)

	result.File = filepath.Join(backupDir, filename)

	dbConfig := DatabaseConfig{
		Container: db.Container,
		Type:      db.Type,
		User:      db.User,
		Password:  db.Password,
		Database:  db.Database,
	}

	backupCmd := dbType.BackupCommand(dbConfig)
	utils.PrintInfo("Executing backup command on %s: %s", db.Container, sanitizeCommand(backupCmd))

	_, err := bm.dockerMgr.ExecDetached(db.Container, backupCmd)
	if err != nil {
		result.Error = fmt.Errorf("backup command failed: %w", err)
		return result
	}

	srcPath := "/tmp/backup.sql"
	if db.Type == "mongodb" {
		srcPath = "/tmp/mongobackup"
	} else if db.Type == "redis" {
		srcPath = "/tmp/backup.rdb"
	}

	utils.PrintInfo("Copying backup from container %s to %s", db.Container, result.File)
	err = bm.dockerMgr.CopyFromContainer(db.Container, srcPath, result.File)
	if err != nil {
		result.Error = fmt.Errorf("failed to copy backup: %w", err)
		return result
	}

	stat, err := os.Stat(result.File)
	if err == nil {
		result.Size = stat.Size()
	}

	cleanupCmd := fmt.Sprintf("rm -rf %s", srcPath)
	_, _ = bm.dockerMgr.ExecDetached(db.Container, cleanupCmd)

	return result
}

func sanitizeCommand(cmd string) string {
	cmd = strings.ReplaceAll(cmd, "PGPASSWORD=", "PGPASSWORD=***")
	cmd = strings.ReplaceAll(cmd, "-p'", "-p'***")
	return cmd
}

func detectDatabaseTypeByName(name string) *DatabaseType {
	for i := range databaseTypes {
		if databaseTypes[i].Name == name {
			return &databaseTypes[i]
		}
	}
	return nil
}

func (bm *BackupManager) BackupNow(projectName string) ([]BackupResult, error) {
	projectCfg, err := config.LoadProjectConfig(projectName, string(config.EnvDevelopment))
	if err != nil {
		return nil, fmt.Errorf("failed to load project config: %w", err)
	}

	if !projectCfg.Backup.Enabled {
		return nil, fmt.Errorf("backup is not enabled for project: %s", projectName)
	}

	bm.pluginMgr.LoadPlugins(projectName)
	envVars := make(map[string]string)
	if err := bm.pluginMgr.ExecuteHook(plugin.HookPreBackup, projectName, envVars); err != nil {
		utils.PrintWarning("Pre-backup hook failed: %v", err)
	}

	databases := projectCfg.Backup.Databases
	if len(databases) == 0 {
		utils.PrintInfo("No databases configured, auto-detecting...")
		detected, err := bm.DetectDatabases(projectName)
		if err != nil {
			return nil, fmt.Errorf("failed to detect databases: %w", err)
		}
		databases = detected
	}

	if len(databases) == 0 {
		return nil, fmt.Errorf("no databases found for backup")
	}

	var results []BackupResult
	for _, db := range databases {
		utils.PrintInfo("Backing up %s database: %s", db.Type, db.Container)
		result := bm.BackupDatabase(projectName, db, projectCfg.Backup)
		results = append(results, result)
	}

	bm.cleanupOldBackups(projectCfg.Backup)

	if err := bm.pluginMgr.ExecuteHook(plugin.HookPostBackup, projectName, envVars); err != nil {
		utils.PrintWarning("Post-backup hook failed: %v", err)
	}

	return results, nil
}

func (bm *BackupManager) Restore(projectName, backupFile string, db config.DatabaseConfig) error {
	bm.pluginMgr.LoadPlugins(projectName)
	envVars := map[string]string{
		"BACKUP_FILE": backupFile,
		"DB_CONTAINER": db.Container,
	}

	if err := bm.pluginMgr.ExecuteHook(plugin.HookPreRestore, projectName, envVars); err != nil {
		utils.PrintWarning("Pre-restore hook failed: %v", err)
	}

	dbType := detectDatabaseTypeByName(db.Type)
	if dbType == nil {
		return fmt.Errorf("unsupported database type: %s", db.Type)
	}

	tmpPath := "/tmp/restore_backup"
	if db.Type == "mongodb" {
		tmpPath = "/tmp/restore_mongobackup"
	} else if db.Type == "redis" {
		tmpPath = "/tmp/restore_backup.rdb"
	}

	utils.PrintInfo("Copying backup to container %s: %s", db.Container, tmpPath)
	if err := bm.dockerMgr.CopyToContainer(db.Container, backupFile, tmpPath); err != nil {
		return fmt.Errorf("failed to copy backup to container: %w", err)
	}

	dbConfig := DatabaseConfig{
		Container: db.Container,
		Type:      db.Type,
		User:      db.User,
		Password:  db.Password,
		Database:  db.Database,
	}

	restoreCmd := dbType.RestoreCommand(dbConfig, tmpPath)
	utils.PrintInfo("Executing restore command on %s", db.Container)

	_, err := bm.dockerMgr.ExecDetached(db.Container, restoreCmd)
	if err != nil {
		return fmt.Errorf("restore command failed: %w", err)
	}

	cleanupCmd := fmt.Sprintf("rm -rf %s", tmpPath)
	_, _ = bm.dockerMgr.ExecDetached(db.Container, cleanupCmd)

	if err := bm.pluginMgr.ExecuteHook(plugin.HookPostRestore, projectName, envVars); err != nil {
		utils.PrintWarning("Post-restore hook failed: %v", err)
	}

	utils.PrintSuccess("Restore completed successfully for %s", db.Container)
	return nil
}

func (bm *BackupManager) ListBackups(projectName string) ([]BackupResult, error) {
	backupDir := filepath.Join(utils.GetBackupsDir(), projectName)
	if !utils.FileExists(backupDir) {
		return nil, fmt.Errorf("no backups found for project: %s", projectName)
	}

	files, err := filepath.Glob(filepath.Join(backupDir, "*"))
	if err != nil {
		return nil, err
	}

	var results []BackupResult
	for _, file := range files {
		stat, err := os.Stat(file)
		if err != nil {
			continue
		}

		results = append(results, BackupResult{
			ProjectName: projectName,
			File:        file,
			Size:        stat.Size(),
			Timestamp:   stat.ModTime(),
		})
	}

	return results, nil
}

func (bm *BackupManager) cleanupOldBackups(cfg config.BackupConfig) {
	if cfg.RetentionDays <= 0 {
		return
	}

	backupDir := utils.ExpandPath(cfg.Directory)
	if backupDir == "" {
		backupDir = utils.GetBackupsDir()
	}

	cutoff := time.Now().AddDate(0, 0, -cfg.RetentionDays)
	utils.PrintInfo("Cleaning up backups older than %s", cutoff.Format("2006-01-02"))

	err := filepath.Walk(backupDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() && info.ModTime().Before(cutoff) {
			utils.PrintInfo("Removing old backup: %s", path)
			if err := os.Remove(path); err != nil {
				utils.PrintWarning("Failed to remove backup: %v", err)
			}
		}
		return nil
	})

	if err != nil {
		utils.PrintWarning("Failed to cleanup old backups: %v", err)
	}
}

func formatSize(b int64) string {
	if b == 0 {
		return "0 B"
	}
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(b)/float64(div), "KMGTPE"[exp])
}

func CopyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
