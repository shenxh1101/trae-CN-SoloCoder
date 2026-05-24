package logs

import (
	"fmt"
	"sync"

	docker "dockdev/internal/docker"
	"dockdev/pkg/utils"
)

type LogAggregator struct {
	dockerMgr *docker.Manager
}

func NewLogAggregator(dockerMgr *docker.Manager) *LogAggregator {
	return &LogAggregator{
		dockerMgr: dockerMgr,
	}
}

func (la *LogAggregator) StreamAll(projectName string, stopChan chan struct{}) error {
	containers, err := la.dockerMgr.ListContainers(projectName)
	if err != nil {
		return err
	}

	if len(containers) == 0 {
		return fmt.Errorf("no containers found for project: %s", projectName)
	}

	var wg sync.WaitGroup
	for i, c := range containers {
		if c.State != "running" {
			continue
		}
		wg.Add(1)
		colorFunc := utils.GetContainerColor(i)
		go func(containerID, prefix string, cf func(a ...interface{}) string) {
			defer wg.Done()
			la.dockerMgr.StreamLogs(containerID, cf, prefix, stopChan)
		}(c.ID, c.Name, colorFunc)
	}

	wg.Wait()
	return nil
}

func (la *LogAggregator) StreamContainer(containerName, projectName string, stopChan chan struct{}) error {
	containers, err := la.dockerMgr.ListContainers(projectName)
	if err != nil {
		return err
	}

	for i, c := range containers {
		if c.Name == containerName || c.ID[:12] == containerName {
			if c.State != "running" {
				return fmt.Errorf("container is not running: %s", containerName)
			}
			colorFunc := utils.GetContainerColor(i)
			la.dockerMgr.StreamLogs(c.ID, colorFunc, c.Name, stopChan)
			return nil
		}
	}

	return fmt.Errorf("container not found: %s", containerName)
}

func (la *LogAggregator) GetLatest(projectName string, lines int) error {
	containers, err := la.dockerMgr.ListContainers(projectName)
	if err != nil {
		return err
	}

	for i, c := range containers {
		colorFunc := utils.GetContainerColor(i)
		fmt.Printf("\n=== %s ===\n", colorFunc(c.Name))

		reader, err := la.dockerMgr.GetContainerLogs(c.ID, false, true)
		if err != nil {
			utils.PrintError("Failed to get logs for %s: %v", c.Name, err)
			continue
		}

		buf := make([]byte, 4096)
		for {
			n, err := reader.Read(buf)
			if n > 0 {
				line := string(buf[:n])
				if len(line) > 8 {
					line = line[8:]
				}
				fmt.Printf("%s %s", colorFunc(c.Name+" |"), line)
			}
			if err != nil {
				break
			}
		}
		reader.Close()
	}

	return nil
}
