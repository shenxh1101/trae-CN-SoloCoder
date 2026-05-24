package cli

import (
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spf13/cobra"

	docker "dockdev/internal/docker"
	"dockdev/internal/health"
)

var (
	watchInterval time.Duration
	watchMode     bool
)

var healthCmd = &cobra.Command{
	Use:   "health [project-name]",
	Short: "Display health status dashboard for project containers",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		dashboard := health.NewDashboard(dockerMgr)

		if !watchMode {
			return dashboard.Display(projectName)
		}

		stopChan := make(chan struct{})
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

		go func() {
			<-sigChan
			close(stopChan)
		}()

		return dashboard.Watch(projectName, watchInterval, stopChan)
	},
}

func init() {
	healthCmd.Flags().BoolVarP(&watchMode, "watch", "w", false, "Watch mode, auto-refresh")
	healthCmd.Flags().DurationVarP(&watchInterval, "interval", "i", 5*time.Second, "Refresh interval in watch mode")

	rootCmd.AddCommand(healthCmd)
}
