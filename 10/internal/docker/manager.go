package docker

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"

	"dockdev/pkg/utils"
)

type Manager struct {
	cli *client.Client
	ctx context.Context
}

type ContainerInfo struct {
	ID              string
	Name            string
	Status          string
	State           string
	Image           string
	Ports           []types.Port
	Labels          map[string]string
	Health          string
	CPUUsage        float64
	MemoryUsage     uint64
	MemoryLimit     uint64
	NetRX           uint64
	NetTX           uint64
	BlockRead       uint64
	BlockWrite      uint64
	PIDs            uint64
	RestartCount    int
	CreatedAt       time.Time
}

func NewManager() (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	return &Manager{
		cli: cli,
		ctx: context.Background(),
	}, nil
}

func (m *Manager) Close() error {
	return m.cli.Close()
}

func (m *Manager) Client() *client.Client {
	return m.cli
}

func (m *Manager) Context() context.Context {
	return m.ctx
}

func (m *Manager) ListContainers(projectName string) ([]ContainerInfo, error) {
	filter := filters.NewArgs()
	if projectName != "" {
		filter.Add("label", fmt.Sprintf("com.docker.compose.project=%s", projectName))
	}

	containers, err := m.cli.ContainerList(m.ctx, container.ListOptions{
		All:     true,
		Filters: filter,
	})
	if err != nil {
		return nil, err
	}

	var info []ContainerInfo
	for _, c := range containers {
		stats, _ := m.GetContainerStats(c.ID)
		health, restartCount, createdAt := m.GetContainerDetailedInfo(c.ID)
		name := strings.TrimPrefix(c.Names[0], "/")
		info = append(info, ContainerInfo{
			ID:              c.ID[:12],
			Name:            name,
			Status:          c.Status,
			State:           c.State,
			Image:           c.Image,
			Ports:           c.Ports,
			Labels:          c.Labels,
			Health:          health,
			CPUUsage:        stats.CPUUsage,
			MemoryUsage:     stats.MemoryUsage,
			MemoryLimit:     stats.MemoryLimit,
			NetRX:           stats.NetRX,
			NetTX:           stats.NetTX,
			BlockRead:       stats.BlockRead,
			BlockWrite:      stats.BlockWrite,
			PIDs:            stats.PIDs,
			RestartCount:    restartCount,
			CreatedAt:       createdAt,
		})
	}
	return info, nil
}

func (m *Manager) GetContainerDetailedInfo(containerID string) (string, int, time.Time) {
	inspect, err := m.cli.ContainerInspect(m.ctx, containerID)
	if err != nil {
		return "unknown", 0, time.Time{}
	}

	health := inspect.State.Status
	if inspect.State.Health != nil {
		health = inspect.State.Health.Status
	}

	restartCount := inspect.RestartCount
	createdAt, _ := time.Parse(time.RFC3339Nano, inspect.Created)

	return health, restartCount, createdAt
}

func (m *Manager) GetContainerHealth(containerID string) string {
	health, _, _ := m.GetContainerDetailedInfo(containerID)
	return health
}

type ContainerStats struct {
	CPUUsage    float64
	MemoryUsage uint64
	MemoryLimit uint64
	NetRX       uint64
	NetTX       uint64
	BlockRead   uint64
	BlockWrite  uint64
	PIDs        uint64
}

func (m *Manager) GetContainerStats(containerID string) (*ContainerStats, error) {
	stats, err := m.cli.ContainerStats(m.ctx, containerID, false)
	if err != nil {
		return &ContainerStats{}, err
	}
	defer stats.Body.Close()

	var v struct {
		CPUStats struct {
			CPUUsage struct {
				TotalUsage  uint64   `json:"total_usage"`
				PercpuUsage []uint64 `json:"percpu_usage"`
			} `json:"cpu_usage"`
			SystemUsage uint64 `json:"system_usage"`
		} `json:"cpu_stats"`
		PreCPUStats struct {
			CPUUsage struct {
				TotalUsage uint64 `json:"total_usage"`
			} `json:"cpu_usage"`
			SystemUsage uint64 `json:"system_usage"`
		} `json:"precpu_stats"`
		MemoryStats struct {
			Usage uint64 `json:"usage"`
			Limit uint64 `json:"limit"`
			Stats struct {
				ActiveAnon             uint64 `json:"active_anon"`
				ActiveFile             uint64 `json:"active_file"`
				InactiveAnon           uint64 `json:"inactive_anon"`
				InactiveFile           uint64 `json:"inactive_file"`
				Unevictable            uint64 `json:"unevictable"`
				RSS                    uint64 `json:"rss"`
				Cache                  uint64 `json:"cache"`
				MappedFile             uint64 `json:"mapped_file"`
			} `json:"stats"`
		} `json:"memory_stats"`
		Networks map[string]struct {
			RxBytes   uint64 `json:"rx_bytes"`
			RxPackets uint64 `json:"rx_packets"`
			RxErrors  uint64 `json:"rx_errors"`
			RxDropped uint64 `json:"rx_dropped"`
			TxBytes   uint64 `json:"tx_bytes"`
			TxPackets uint64 `json:"tx_packets"`
			TxErrors  uint64 `json:"tx_errors"`
			TxDropped uint64 `json:"tx_dropped"`
		} `json:"networks"`
		BlkioStats struct {
			IoServiceBytesRecursive []struct {
				Op    string `json:"op"`
				Value uint64 `json:"value"`
			} `json:"io_service_bytes_recursive"`
		} `json:"blkio_stats"`
		PidsStats struct {
			Current uint64 `json:"current"`
			Limit   uint64 `json:"limit"`
		} `json:"pids_stats"`
	}
	if err := json.NewDecoder(stats.Body).Decode(&v); err != nil {
		return &ContainerStats{}, err
	}

	cpuDelta := float64(v.CPUStats.CPUUsage.TotalUsage - v.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(v.CPUStats.SystemUsage - v.PreCPUStats.SystemUsage)
	cpuUsage := 0.0
	if systemDelta > 0.0 && cpuDelta > 0.0 {
		cpuUsage = (cpuDelta / systemDelta) * float64(len(v.CPUStats.CPUUsage.PercpuUsage)) * 100.0
	}

	var netRX, netTX uint64
	for _, net := range v.Networks {
		netRX += net.RxBytes
		netTX += net.TxBytes
	}

	var blockRead, blockWrite uint64
	for _, entry := range v.BlkioStats.IoServiceBytesRecursive {
		switch entry.Op {
		case "Read":
			blockRead += entry.Value
		case "Write":
			blockWrite += entry.Value
		}
	}

	return &ContainerStats{
		CPUUsage:    cpuUsage,
		MemoryUsage: v.MemoryStats.Usage,
		MemoryLimit: v.MemoryStats.Limit,
		NetRX:       netRX,
		NetTX:       netTX,
		BlockRead:   blockRead,
		BlockWrite:  blockWrite,
		PIDs:        v.PidsStats.Current,
	}, nil
}

func (m *Manager) ComposeUp(projectDir, projectName string, envFile string) error {
	args := []string{"compose", "-p", projectName, "up", "-d"}
	if envFile != "" {
		args = append(args, "--env-file", envFile)
	}

	cmd := exec.Command("docker", args...)
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "COMPOSE_IGNORE_ORPHANS=True")

	return cmd.Run()
}

func (m *Manager) ComposeDown(projectDir, projectName string) error {
	cmd := exec.Command("docker", "compose", "-p", projectName, "down")
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) ComposeStart(projectDir, projectName string) error {
	cmd := exec.Command("docker", "compose", "-p", projectName, "start")
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) ComposeStop(projectDir, projectName string) error {
	cmd := exec.Command("docker", "compose", "-p", projectName, "stop")
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) ComposeRestart(projectDir, projectName string) error {
	cmd := exec.Command("docker", "compose", "-p", projectName, "restart")
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) ComposeBuild(projectDir, projectName string) error {
	cmd := exec.Command("docker", "compose", "-p", projectName, "build")
	cmd.Dir = projectDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) GetContainerLogs(containerID string, follow, tail bool) (io.ReadCloser, error) {
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
	}
	if tail {
		options.Tail = "100"
	}
	return m.cli.ContainerLogs(m.ctx, containerID, options)
}

func (m *Manager) StreamLogs(containerID string, colorFunc func(a ...interface{}) string, prefix string, stopChan chan struct{}) {
	reader, err := m.GetContainerLogs(containerID, true, true)
	if err != nil {
		utils.PrintError("Failed to get logs for %s: %v", containerID, err)
		return
	}
	defer reader.Close()

	scanner := bufio.NewScanner(reader)
	for {
		select {
		case <-stopChan:
			return
		default:
			if scanner.Scan() {
				line := scanner.Text()
				if len(line) > 8 {
					line = line[8:]
				}
				fmt.Printf("%s %s\n", colorFunc(prefix), line)
			} else {
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}

func (m *Manager) Exec(containerName string, command string, interactive bool) error {
	args := []string{"exec"}
	if interactive {
		args = append(args, "-it")
	}
	args = append(args, containerName)
	if interactive {
		args = append(args, "sh")
	} else {
		args = append(args, "sh", "-c", command)
	}

	cmd := exec.Command("docker", args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (m *Manager) ExecDetached(containerName string, command string) (string, error) {
	execConfig := container.ExecOptions{
		Cmd:          []string{"sh", "-c", command},
		AttachStdout: true,
		AttachStderr: true,
	}

	execResp, err := m.cli.ContainerExecCreate(m.ctx, containerName, execConfig)
	if err != nil {
		return "", err
	}

	resp, err := m.cli.ContainerExecAttach(m.ctx, execResp.ID, container.ExecStartOptions{})
	if err != nil {
		return "", err
	}
	defer resp.Close()

	var output strings.Builder
	_, err = stdcopy.StdCopy(&output, &output, resp.Reader)
	if err != nil {
		return "", err
	}

	return output.String(), nil
}

func (m *Manager) CopyFromContainer(containerName, srcPath, destPath string) error {
	utils.EnsureDir(filepath.Dir(destPath))
	cmd := exec.Command("docker", "cp", fmt.Sprintf("%s:%s", containerName, srcPath), destPath)
	return cmd.Run()
}

func (m *Manager) CopyToContainer(containerName, srcPath, destPath string) error {
	cmd := exec.Command("docker", "cp", srcPath, fmt.Sprintf("%s:%s", containerName, destPath))
	return cmd.Run()
}

func (m *Manager) GetContainerIDByName(name, projectName string) (string, error) {
	containers, err := m.ListContainers(projectName)
	if err != nil {
		return "", err
	}

	for _, c := range containers {
		if strings.Contains(c.Name, name) {
			return c.ID, nil
		}
	}

	return "", fmt.Errorf("container not found: %s", name)
}

func (m *Manager) CommitContainer(containerID, imageName string) error {
	_, err := m.cli.ContainerCommit(m.ctx, containerID, container.CommitOptions{
		Reference: imageName,
	})
	return err
}

func (m *Manager) CreateContainerFromImage(imageName, containerName string, portBindings map[string]string, env []string) error {
	hostConfig := &container.HostConfig{}
	if len(portBindings) > 0 {
		portMap := make(map[nat.Port][]nat.PortBinding)
		for hostPort, containerPort := range portBindings {
			portMap[nat.Port(containerPort)] = []nat.PortBinding{
				{HostIP: "0.0.0.0", HostPort: hostPort},
			}
		}
		hostConfig.PortBindings = portMap
	}

	_, err := m.cli.ContainerCreate(m.ctx, &container.Config{
		Image: imageName,
		Env:   env,
	}, hostConfig, nil, nil, containerName)
	return err
}

func (m *Manager) RemoveContainer(containerID string, force bool) error {
	return m.cli.ContainerRemove(m.ctx, containerID, container.RemoveOptions{
		Force: force,
	})
}

func (m *Manager) StartContainer(containerID string) error {
	return m.cli.ContainerStart(m.ctx, containerID, container.StartOptions{})
}

func (m *Manager) StopContainer(containerID string, timeout *time.Duration) error {
	var timeoutSeconds *int
	if timeout != nil {
		seconds := int(timeout.Seconds())
		timeoutSeconds = &seconds
	}
	return m.cli.ContainerStop(m.ctx, containerID, container.StopOptions{
		Timeout: timeoutSeconds,
	})
}
