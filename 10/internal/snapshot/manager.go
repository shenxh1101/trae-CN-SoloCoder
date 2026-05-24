package snapshot

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/go-connections/nat"

	"dockdev/internal/config"
	docker "dockdev/internal/docker"
	"dockdev/internal/env"
	"dockdev/internal/plugin"
	"dockdev/pkg/utils"
)

type Snapshot struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	ProjectName string              `json:"project_name"`
	CreatedAt   time.Time           `json:"created_at"`
	Description string              `json:"description"`
	Containers  []ContainerSnapshot `json:"containers"`
	Network     string              `json:"network"`
}

type ContainerSnapshot struct {
	ContainerID    string            `json:"container_id"`
	ContainerName  string            `json:"container_name"`
	ImageID        string            `json:"image_id"`
	ImageName      string            `json:"image_name"`
	OriginalImage  string            `json:"original_image"`
	State          string            `json:"state"`
	Command        []string          `json:"command"`
	Entrypoint     []string          `json:"entrypoint"`
	Env            []string          `json:"env"`
	WorkingDir     string            `json:"working_dir"`
	User           string            `json:"user"`
	PortBindings   map[string]string `json:"port_bindings"`
	ExposedPorts   []string          `json:"exposed_ports"`
	Volumes        []string          `json:"volumes"`
	VolumeBinds    []string          `json:"volume_binds"`
	NetworkMode    string            `json:"network_mode"`
	Networks       []string          `json:"networks"`
	RestartPolicy  string            `json:"restart_policy"`
	MemoryLimit    int64             `json:"memory_limit"`
	CPUShares      int64             `json:"cpu_shares"`
	Healthcheck    *HealthcheckConfig `json:"healthcheck,omitempty"`
}

type HealthcheckConfig struct {
	Test        []string `json:"test"`
	Interval    int64    `json:"interval"`
	Timeout     int64    `json:"timeout"`
	Retries     int      `json:"retries"`
	StartPeriod int64    `json:"start_period"`
}

type Manager struct {
	dockerMgr *docker.Manager
	pluginMgr *plugin.Manager
}

func NewManager(dockerMgr *docker.Manager) *Manager {
	return &Manager{
		dockerMgr: dockerMgr,
		pluginMgr: plugin.NewManager(),
	}
}

func (sm *Manager) Create(projectName, name, description string) (*Snapshot, error) {
	sm.pluginMgr.LoadPlugins(projectName)
	envVars := map[string]string{
		"SNAPSHOT_NAME": name,
	}
	if err := sm.pluginMgr.ExecuteHook(plugin.HookPreSnapshot, projectName, envVars); err != nil {
		utils.PrintWarning("Pre-snapshot hook failed: %v", err)
	}

	containers, err := sm.dockerMgr.ListContainers(projectName)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found for project: %s", projectName)
	}

	snapshotID := fmt.Sprintf("%s_%d", projectName, time.Now().Unix())

	var containerSnapshots []ContainerSnapshot
	for _, c := range containers {
		imageName := fmt.Sprintf("dockdev-snapshot:%s_%s", snapshotID, c.Name)
		utils.PrintInfo("Committing container %s to image %s", c.Name, imageName)

		containerConfig, err := sm.getContainerFullConfig(c.ID)
		if err != nil {
			utils.PrintWarning("Failed to get config for %s: %v", c.Name, err)
			continue
		}

		if err := sm.dockerMgr.CommitContainer(c.ID, imageName); err != nil {
			utils.PrintWarning("Failed to commit container %s: %v", c.Name, err)
			continue
		}

		containerSnapshots = append(containerSnapshots, ContainerSnapshot{
			ContainerID:   c.ID,
			ContainerName: c.Name,
			ImageName:     imageName,
			OriginalImage: c.Image,
			State:         c.State,
			Command:       containerConfig.Cmd,
			Entrypoint:    containerConfig.Entrypoint,
			Env:           containerConfig.Env,
			WorkingDir:    containerConfig.WorkingDir,
			User:          containerConfig.User,
			PortBindings:  containerConfig.PortBindings,
			ExposedPorts:  containerConfig.ExposedPorts,
			Volumes:       containerConfig.Volumes,
			VolumeBinds:   containerConfig.VolumeBinds,
			NetworkMode:   containerConfig.NetworkMode,
			Networks:      containerConfig.Networks,
			RestartPolicy: containerConfig.RestartPolicy,
			MemoryLimit:   containerConfig.MemoryLimit,
			CPUShares:     containerConfig.CPUShares,
			Healthcheck:   containerConfig.Healthcheck,
		})
	}

	if len(containerSnapshots) == 0 {
		return nil, fmt.Errorf("no containers were successfully snapshotted")
	}

	snapshot := &Snapshot{
		ID:          snapshotID,
		Name:        name,
		ProjectName: projectName,
		CreatedAt:   time.Now(),
		Description: description,
		Containers:  containerSnapshots,
		Network:     fmt.Sprintf("%s_default", projectName),
	}

	if err := sm.saveSnapshot(snapshot); err != nil {
		return nil, fmt.Errorf("failed to save snapshot: %w", err)
	}

	envVars["SNAPSHOT_ID"] = snapshotID
	if err := sm.pluginMgr.ExecuteHook(plugin.HookPostSnapshot, projectName, envVars); err != nil {
		utils.PrintWarning("Post-snapshot hook failed: %v", err)
	}

	utils.PrintSuccess("Snapshot created successfully: %s", snapshotID)
	return snapshot, nil
}

func (sm *Manager) getContainerFullConfig(containerID string) (*ContainerConfig, error) {
	ctx := context.Background()
	inspect, err := sm.dockerMgr.Client().ContainerInspect(ctx, containerID)
	if err != nil {
		return nil, err
	}

	cfg := &ContainerConfig{
		Cmd:           inspect.Config.Cmd,
		Entrypoint:    inspect.Config.Entrypoint,
		Env:           inspect.Config.Env,
		WorkingDir:    inspect.Config.WorkingDir,
		User:          inspect.Config.User,
		NetworkMode:   string(inspect.HostConfig.NetworkMode),
		MemoryLimit:   inspect.HostConfig.Resources.Memory,
		CPUShares:     inspect.HostConfig.Resources.CPUShares,
		RestartPolicy: string(inspect.HostConfig.RestartPolicy.Name),
	}

	for port := range inspect.Config.ExposedPorts {
		cfg.ExposedPorts = append(cfg.ExposedPorts, string(port))
	}

	for v := range inspect.Config.Volumes {
		cfg.Volumes = append(cfg.Volumes, v)
	}

	cfg.VolumeBinds = inspect.HostConfig.Binds

	for port, bindings := range inspect.HostConfig.PortBindings {
		if len(bindings) > 0 {
			if cfg.PortBindings == nil {
				cfg.PortBindings = make(map[string]string)
			}
			cfg.PortBindings[string(port)] = bindings[0].HostPort
		}
	}

	for name := range inspect.NetworkSettings.Networks {
		cfg.Networks = append(cfg.Networks, name)
	}

	if inspect.Config.Healthcheck != nil {
		cfg.Healthcheck = &HealthcheckConfig{
			Test:        inspect.Config.Healthcheck.Test,
			Interval:    int64(inspect.Config.Healthcheck.Interval),
			Timeout:     int64(inspect.Config.Healthcheck.Timeout),
			Retries:     inspect.Config.Healthcheck.Retries,
			StartPeriod: int64(inspect.Config.Healthcheck.StartPeriod),
		}
	}

	return cfg, nil
}

type ContainerConfig struct {
	Cmd           []string
	Entrypoint    []string
	Env           []string
	WorkingDir    string
	User          string
	PortBindings  map[string]string
	ExposedPorts  []string
	Volumes       []string
	VolumeBinds   []string
	NetworkMode   string
	Networks      []string
	RestartPolicy string
	MemoryLimit   int64
	CPUShares     int64
	Healthcheck   *HealthcheckConfig
}

func (sm *Manager) Restore(snapshotID string) error {
	snapshot, err := sm.loadSnapshot(snapshotID)
	if err != nil {
		return fmt.Errorf("failed to load snapshot: %w", err)
	}

	sm.pluginMgr.LoadPlugins(snapshot.ProjectName)
	envVars := map[string]string{
		"SNAPSHOT_ID":   snapshotID,
		"SNAPSHOT_NAME": snapshot.Name,
	}

	if err := sm.pluginMgr.ExecuteHook(plugin.HookPreRestoreSnapshot, snapshot.ProjectName, envVars); err != nil {
		utils.PrintWarning("Pre-restore-snapshot hook failed: %v", err)
	}

	projectCfg, err := config.LoadProjectConfig(snapshot.ProjectName, string(config.EnvDevelopment))
	if err != nil {
		return fmt.Errorf("failed to load project config: %w", err)
	}

	utils.PrintInfo("Stopping current containers for project: %s", snapshot.ProjectName)
	if err := sm.dockerMgr.ComposeDown(projectCfg.Path, snapshot.ProjectName); err != nil {
		utils.PrintWarning("Failed to stop containers: %v", err)
	}

	if snapshot.Network != "" {
		utils.PrintInfo("Ensuring network exists: %s", snapshot.Network)
		if err := sm.ensureNetwork(snapshot.Network); err != nil {
			utils.PrintWarning("Failed to create network: %v", err)
		}
	}

	for _, cs := range snapshot.Containers {
		utils.PrintInfo("Restoring container %s from snapshot image %s", cs.ContainerName, cs.ImageName)

		if err := sm.dockerMgr.RemoveContainer(cs.ContainerName, true); err != nil {
			utils.PrintWarning("Failed to remove existing container: %v", err)
		}

		env := cs.Env
		if len(env) == 0 {
			loadedEnv, err := sm.loadContainerEnv(snapshot.ProjectName, cs.ContainerName)
			if err == nil && len(loadedEnv) > 0 {
				env = loadedEnv
			}
		}

		portBindings := cs.PortBindings
		if len(portBindings) == 0 && len(cs.ExposedPorts) > 0 {
			portBindings = sm.autoAssignPorts(cs.ExposedPorts)
		}

		config := &container.Config{
			Image:        cs.ImageName,
			Cmd:          cs.Command,
			Entrypoint:   cs.Entrypoint,
			Env:          env,
			WorkingDir:   cs.WorkingDir,
			User:         cs.User,
			ExposedPorts: make(map[nat.Port]struct{}),
			Tty:          true,
			OpenStdin:    true,
		}

		for _, p := range cs.ExposedPorts {
			port, err := nat.NewPort(strings.Split(p, "/")[0], strings.Split(p, "/")[1])
			if err == nil {
				config.ExposedPorts[port] = struct{}{}
			}
		}

		hostConfig := &container.HostConfig{
			Binds:       cs.VolumeBinds,
			NetworkMode: container.NetworkMode(cs.NetworkMode),
			Resources: container.Resources{
				Memory:    cs.MemoryLimit,
				CPUShares: cs.CPUShares,
			},
			PortBindings: make(nat.PortMap),
			RestartPolicy: container.RestartPolicy{
				Name: container.RestartPolicyMode(cs.RestartPolicy),
			},
		}

		for containerPort, hostPort := range portBindings {
			port, err := nat.NewPort(strings.Split(containerPort, "/")[0], strings.Split(containerPort, "/")[1])
			if err == nil {
				hostConfig.PortBindings[port] = []nat.PortBinding{
					{HostIP: "127.0.0.1", HostPort: hostPort},
				}
			}
		}

		networkConfig := &network.NetworkingConfig{
			EndpointsConfig: make(map[string]*network.EndpointSettings),
		}
		for _, netName := range cs.Networks {
			networkConfig.EndpointsConfig[netName] = &network.EndpointSettings{}
		}
		if len(cs.Networks) == 0 && snapshot.Network != "" {
			networkConfig.EndpointsConfig[snapshot.Network] = &network.EndpointSettings{}
		}

		ctx := context.Background()
		resp, err := sm.dockerMgr.Client().ContainerCreate(
			ctx,
			config,
			hostConfig,
			networkConfig,
			nil,
			cs.ContainerName,
		)
		if err != nil {
			utils.PrintWarning("Failed to create container %s: %v", cs.ContainerName, err)
			continue
		}

		if cs.State == "running" {
			if err := sm.dockerMgr.StartContainer(resp.ID); err != nil {
				utils.PrintWarning("Failed to start container %s: %v", cs.ContainerName, err)
			} else {
				utils.PrintSuccess("Container %s started successfully", cs.ContainerName)
			}
		}
	}

	if err := sm.pluginMgr.ExecuteHook(plugin.HookPostRestoreSnapshot, snapshot.ProjectName, envVars); err != nil {
		utils.PrintWarning("Post-restore-snapshot hook failed: %v", err)
	}

	utils.PrintSuccess("Snapshot restored successfully: %s", snapshotID)
	return nil
}

func (sm *Manager) ensureNetwork(networkName string) error {
	cmd := exec.Command("docker", "network", "inspect", networkName)
	if err := cmd.Run(); err == nil {
		return nil
	}

	cmd = exec.Command("docker", "network", "create", "--driver", "bridge", networkName)
	return cmd.Run()
}

func (sm *Manager) autoAssignPorts(exposedPorts []string) map[string]string {
	portBindings := make(map[string]string)
	for _, p := range exposedPorts {
		portParts := strings.Split(p, "/")
		if len(portParts) != 2 {
			continue
		}
		containerPort := portParts[0]
		proto := portParts[1]

		freePort, err := utils.GetFreePort()
		if err != nil {
			continue
		}
		portBindings[fmt.Sprintf("%s/%s", containerPort, proto)] = fmt.Sprintf("%d", freePort)
	}
	return portBindings
}

func (sm *Manager) List(projectName string) ([]Snapshot, error) {
	pattern := filepath.Join(utils.GetSnapshotsDir(), fmt.Sprintf("%s_*.json", projectName))
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, err
	}

	var snapshots []Snapshot
	for _, file := range files {
		s, err := sm.loadSnapshotFile(file)
		if err == nil {
			snapshots = append(snapshots, *s)
		}
	}

	return snapshots, nil
}

func (sm *Manager) ListAll() ([]Snapshot, error) {
	pattern := filepath.Join(utils.GetSnapshotsDir(), "*.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, err
	}

	var snapshots []Snapshot
	for _, file := range files {
		s, err := sm.loadSnapshotFile(file)
		if err == nil {
			snapshots = append(snapshots, *s)
		}
	}

	return snapshots, nil
}

func (sm *Manager) Delete(snapshotID string) error {
	snapshot, err := sm.loadSnapshot(snapshotID)
	if err != nil {
		return fmt.Errorf("failed to load snapshot: %w", err)
	}

	sm.pluginMgr.LoadPlugins(snapshot.ProjectName)
	envVars := map[string]string{
		"SNAPSHOT_ID":   snapshotID,
		"SNAPSHOT_NAME": snapshot.Name,
	}
	if err := sm.pluginMgr.ExecuteHook(plugin.HookPreDeleteSnapshot, snapshot.ProjectName, envVars); err != nil {
		utils.PrintWarning("Pre-delete-snapshot hook failed: %v", err)
	}

	ctx := context.Background()
	for _, cs := range snapshot.Containers {
		utils.PrintInfo("Removing snapshot image: %s", cs.ImageName)
		_, err := sm.dockerMgr.Client().ImageRemove(ctx, cs.ImageName, image.RemoveOptions{
			Force:         true,
			PruneChildren: true,
		})
		if err != nil {
			utils.PrintWarning("Failed to remove image %s: %v", cs.ImageName, err)
		}
	}

	snapshotFile := sm.getSnapshotPath(snapshotID)
	if err := os.Remove(snapshotFile); err != nil {
		return fmt.Errorf("failed to remove snapshot file: %w", err)
	}

	if err := sm.pluginMgr.ExecuteHook(plugin.HookPostDeleteSnapshot, snapshot.ProjectName, envVars); err != nil {
		utils.PrintWarning("Post-delete-snapshot hook failed: %v", err)
	}

	utils.PrintSuccess("Snapshot deleted successfully: %s", snapshotID)
	return nil
}

func (sm *Manager) Apply(snapshotID string) error {
	return sm.Restore(snapshotID)
}

func (sm *Manager) saveSnapshot(snapshot *Snapshot) error {
	utils.EnsureDir(utils.GetSnapshotsDir())
	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	path := sm.getSnapshotPath(snapshot.ID)
	return os.WriteFile(path, data, 0644)
}

func (sm *Manager) loadSnapshot(snapshotID string) (*Snapshot, error) {
	path := sm.getSnapshotPath(snapshotID)
	return sm.loadSnapshotFile(path)
}

func (sm *Manager) loadSnapshotFile(path string) (*Snapshot, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read snapshot file: %w", err)
	}

	var snapshot Snapshot
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return nil, fmt.Errorf("failed to parse snapshot: %w", err)
	}

	return &snapshot, nil
}

func (sm *Manager) getSnapshotPath(snapshotID string) string {
	return filepath.Join(utils.GetSnapshotsDir(), fmt.Sprintf("%s.json", snapshotID))
}

func (sm *Manager) loadContainerEnv(projectName, containerName string) ([]string, error) {
	envs, err := env.LoadEnv(projectName)
	if err != nil {
		return nil, err
	}

	var envList []string
	for k, v := range envs {
		envList = append(envList, fmt.Sprintf("%s=%s", k, v))
	}
	return envList, nil
}
