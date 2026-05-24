package health

import (
	"fmt"
	"os"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/olekukonko/tablewriter"

	docker "dockdev/internal/docker"
	"dockdev/pkg/utils"
)

type CheckResult struct {
	ContainerName string
	Status        string
	Health        string
	CPUUsage      float64
	MemoryUsage   uint64
	MemoryLimit   uint64
	NetRX         uint64
	NetTX         uint64
	BlockRead     uint64
	BlockWrite    uint64
	PIDs          uint64
	Ports         string
}

type Dashboard struct {
	dockerMgr *docker.Manager
}

func NewDashboard(dockerMgr *docker.Manager) *Dashboard {
	return &Dashboard{
		dockerMgr: dockerMgr,
	}
}

func (d *Dashboard) Display(projectName string) error {
	containers, err := d.dockerMgr.ListContainers(projectName)
	if err != nil {
		return err
	}

	if len(containers) == 0 {
		utils.PrintWarning("No containers found for project: %s", projectName)
		return nil
	}

	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"Container", "Status", "Health", "CPU %", "Memory", "Net RX/TX", "Block R/W", "PIDs", "Ports", "Uptime"})
	table.SetAutoWrapText(false)
	table.SetAutoFormatHeaders(true)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)
	table.SetBorder(true)
	table.SetColumnSeparator("│")
	table.SetRowSeparator("─")
	table.SetCenterSeparator("┼")

	for _, c := range containers {
		status := c.Status
		health := c.Health
		ports := formatPorts(c.Ports)

		statusColor := getStatusColor(c.State)
		healthColor := getHealthColor(health)

		memPercent := 0.0
		if c.MemoryLimit > 0 {
			memPercent = float64(c.MemoryUsage) / float64(c.MemoryLimit) * 100
		}
		memStr := fmt.Sprintf("%s / %s\n(%.1f%%)",
			formatBytes(c.MemoryUsage),
			formatBytes(c.MemoryLimit),
			memPercent)

		netStr := fmt.Sprintf("%s / %s", formatBytes(c.NetRX), formatBytes(c.NetTX))
		blockStr := fmt.Sprintf("%s / %s", formatBytes(c.BlockRead), formatBytes(c.BlockWrite))
		pidsStr := fmt.Sprintf("%d", c.PIDs)
		uptimeStr := formatUptime(c.CreatedAt)

		colors := []tablewriter.Colors{
			{tablewriter.Bold, tablewriter.FgHiWhiteColor},
			statusColor,
			healthColor,
			getCPUColor(c.CPUUsage),
			{tablewriter.FgCyanColor},
			{tablewriter.FgHiMagentaColor},
			{tablewriter.FgHiYellowColor},
			{tablewriter.FgHiBlueColor},
			{tablewriter.FgMagentaColor},
			{tablewriter.FgWhiteColor},
		}

		table.Rich([]string{
			c.Name,
			status,
			health,
			fmt.Sprintf("%.2f", c.CPUUsage),
			memStr,
			netStr,
			blockStr,
			pidsStr,
			ports,
			uptimeStr,
		}, colors)
	}

	table.SetAutoMergeCells(false)
	table.Render()

	running := 0
	healthy := 0
	unhealthy := 0
	totalCPU := 0.0
	totalMemory := uint64(0)

	for _, c := range containers {
		if c.State == "running" {
			running++
			if c.Health == "healthy" {
				healthy++
			} else if c.Health == "unhealthy" {
				unhealthy++
			}
			totalCPU += c.CPUUsage
			totalMemory += c.MemoryUsage
		}
	}

	fmt.Println()
	summaryTable := tablewriter.NewWriter(os.Stdout)
	summaryTable.SetHeader([]string{"Total", "Running", "Healthy", "Unhealthy", "Total CPU", "Total Memory"})
	summaryTable.SetBorder(true)

	summaryTable.Rich([]string{
		fmt.Sprintf("%d", len(containers)),
		fmt.Sprintf("%d", running),
		fmt.Sprintf("%d", healthy),
		fmt.Sprintf("%d", unhealthy),
		fmt.Sprintf("%.2f%%", totalCPU),
		formatBytes(totalMemory),
	}, []tablewriter.Colors{
		{tablewriter.Bold},
		{tablewriter.Bold, tablewriter.FgGreenColor},
		{tablewriter.Bold, tablewriter.FgHiGreenColor},
		{tablewriter.Bold, tablewriter.FgRedColor},
		{tablewriter.Bold, tablewriter.FgCyanColor},
		{tablewriter.Bold, tablewriter.FgCyanColor},
	})
	summaryTable.Render()

	return nil
}

func (d *Dashboard) Watch(projectName string, interval time.Duration, stopChan chan struct{}) error {
	for {
		select {
		case <-stopChan:
			return nil
		default:
			fmt.Print("\033[H\033[2J")
			fmt.Printf("%s - %s (Refreshing every %v)\n\n",
				utils.Bold(utils.Cyan("DockDev Health Dashboard")),
				utils.Bold(projectName),
				interval)
			if err := d.Display(projectName); err != nil {
				return err
			}
			fmt.Printf("\n%s Press Ctrl+C to exit\n", utils.Grey("←"))
			time.Sleep(interval)
		}
	}
}

func getStatusColor(state string) tablewriter.Colors {
	switch state {
	case "running":
		return tablewriter.Colors{tablewriter.FgGreenColor, tablewriter.Bold}
	case "exited":
		return tablewriter.Colors{tablewriter.FgRedColor, tablewriter.Bold}
	case "paused":
		return tablewriter.Colors{tablewriter.FgYellowColor, tablewriter.Bold}
	case "restarting":
		return tablewriter.Colors{tablewriter.FgHiYellowColor, tablewriter.Bold}
	case "dead":
		return tablewriter.Colors{tablewriter.FgHiRedColor, tablewriter.Bold}
	default:
		return tablewriter.Colors{tablewriter.FgWhiteColor}
	}
}

func getHealthColor(health string) tablewriter.Colors {
	switch health {
	case "healthy":
		return tablewriter.Colors{tablewriter.FgGreenColor, tablewriter.Bold}
	case "unhealthy":
		return tablewriter.Colors{tablewriter.FgRedColor, tablewriter.Bold}
	case "starting":
		return tablewriter.Colors{tablewriter.FgYellowColor, tablewriter.Bold}
	case "none":
		return tablewriter.Colors{tablewriter.FgWhiteColor}
	default:
		return tablewriter.Colors{tablewriter.FgHiWhiteColor}
	}
}

func getCPUColor(usage float64) tablewriter.Colors {
	if usage > 80 {
		return tablewriter.Colors{tablewriter.FgRedColor, tablewriter.Bold}
	} else if usage > 50 {
		return tablewriter.Colors{tablewriter.FgYellowColor, tablewriter.Bold}
	}
	return tablewriter.Colors{tablewriter.FgGreenColor}
}

func formatPorts(ports []types.Port) string {
	if len(ports) == 0 {
		return utils.Grey("none")
	}

	var result []string
	for _, p := range ports {
		if p.PublicPort != 0 {
			result = append(result, fmt.Sprintf("%d→%d", p.PublicPort, p.PrivatePort))
		}
	}

	if len(result) == 0 {
		for _, p := range ports {
			result = append(result, fmt.Sprintf("%d", p.PrivatePort))
		}
	}

	return join(result, ", ")
}

func formatBytes(b uint64) string {
	if b == 0 {
		return "0 B"
	}
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(b)/float64(div), "KMGTPE"[exp])
}

func formatUptime(createdAt time.Time) string {
	if createdAt.IsZero() {
		return "N/A"
	}

	duration := time.Since(createdAt)
	days := int(duration.Hours() / 24)
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}

func join(ss []string, sep string) string {
	result := ""
	for i, s := range ss {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
