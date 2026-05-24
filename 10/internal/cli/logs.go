package cli

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	docker "dockdev/internal/docker"
	"dockdev/internal/logs"
)

var (
	followLogs bool
	tailLogs   bool
)

var logsCmd = &cobra.Command{
	Use:   "logs [project-name] [container]",
	Short: "View aggregated logs from all containers",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		containerName := ""
		if len(args) > 1 {
			containerName = args[1]
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		logAggregator := logs.NewLogAggregator(dockerMgr)

		if !followLogs {
			return logAggregator.GetLatest(projectName, 100)
		}

		stopChan := make(chan struct{})
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

		go func() {
			<-sigChan
			close(stopChan)
		}()

		if containerName != "" {
			return logAggregator.StreamContainer(containerName, projectName, stopChan)
		}

		return logAggregator.StreamAll(projectName, stopChan)
	},
}

func init() {
	logsCmd.Flags().BoolVarP(&followLogs, "follow", "f", true, "Follow log output")
	logsCmd.Flags().BoolVarP(&tailLogs, "tail", "t", true, "Show only the last 100 lines")

	rootCmd.AddCommand(logsCmd)
}
