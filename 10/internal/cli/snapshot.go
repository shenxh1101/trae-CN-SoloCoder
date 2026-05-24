package cli

import (
	"os"

	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"

	docker "dockdev/internal/docker"
	"dockdev/internal/snapshot"
	"dockdev/pkg/utils"
)

var (
	snapshotDesc string
)

var snapshotCmd = &cobra.Command{
	Use:   "snapshot",
	Short: "Manage environment snapshots",
}

var snapshotCreateCmd = &cobra.Command{
	Use:   "create [project-name] [name]",
	Short: "Create a snapshot of the current environment",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		name := projectName
		if len(args) > 1 {
			name = args[1]
		}

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		snapshotMgr := snapshot.NewManager(dockerMgr)

		s, err := snapshotMgr.Create(projectName, name, snapshotDesc)
		if err != nil {
			return err
		}

		utils.PrintSuccess("Snapshot created: %s", s.ID)
		return nil
	},
}

var snapshotListCmd = &cobra.Command{
	Use:   "list [project-name]",
	Short: "List all snapshots",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		snapshotMgr := snapshot.NewManager(dockerMgr)

		snapshots, err := snapshotMgr.List(projectName)
		if err != nil {
			return err
		}

		if len(snapshots) == 0 {
			utils.PrintWarning("No snapshots found")
			return nil
		}

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader([]string{"ID", "Name", "Created", "Description"})

		for _, s := range snapshots {
			table.Append([]string{
				s.ID,
				s.Name,
				s.CreatedAt.Format("2006-01-02 15:04:05"),
				s.Description,
			})
		}

		table.Render()
		return nil
	},
}

var snapshotRestoreCmd = &cobra.Command{
	Use:   "restore [snapshot-id]",
	Short: "Restore from a snapshot",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		snapshotID := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		snapshotMgr := snapshot.NewManager(dockerMgr)

		return snapshotMgr.Restore(snapshotID)
	},
}

var snapshotDeleteCmd = &cobra.Command{
	Use:   "delete [snapshot-id]",
	Short: "Delete a snapshot",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		snapshotID := args[0]

		dockerMgr, err := docker.NewManager()
		if err != nil {
			return err
		}
		defer dockerMgr.Close()

		snapshotMgr := snapshot.NewManager(dockerMgr)

		if err := snapshotMgr.Delete(snapshotID); err != nil {
			return err
		}

		utils.PrintSuccess("Snapshot deleted: %s", snapshotID)
		return nil
	},
}

func init() {
	snapshotCreateCmd.Flags().StringVarP(&snapshotDesc, "description", "d", "", "Snapshot description")

	snapshotCmd.AddCommand(snapshotCreateCmd)
	snapshotCmd.AddCommand(snapshotListCmd)
	snapshotCmd.AddCommand(snapshotRestoreCmd)
	snapshotCmd.AddCommand(snapshotDeleteCmd)

	rootCmd.AddCommand(snapshotCmd)
}
