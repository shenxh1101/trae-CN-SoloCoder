package port

import (
	"fmt"
	"net"
	"sync"
)

type PortManager struct {
	usedPorts map[int]bool
	mu        sync.Mutex
}

func NewPortManager() *PortManager {
	return &PortManager{
		usedPorts: make(map[int]bool),
	}
}

func (pm *PortManager) IsPortAvailable(port int) bool {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if pm.usedPorts[port] {
		return false
	}

	addr := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return false
	}
	listener.Close()
	return true
}

func (pm *PortManager) FindAvailablePort(startPort, endPort int) (int, error) {
	for port := startPort; port <= endPort; port++ {
		if pm.IsPortAvailable(port) {
			pm.mu.Lock()
			pm.usedPorts[port] = true
			pm.mu.Unlock()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port in range %d-%d", startPort, endPort)
}

func (pm *PortManager) FindAvailablePortFromList(ports []int) (int, error) {
	for _, port := range ports {
		if pm.IsPortAvailable(port) {
			pm.mu.Lock()
			pm.usedPorts[port] = true
			pm.mu.Unlock()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port in list: %v", ports)
}

func (pm *PortManager) ReleasePort(port int) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	delete(pm.usedPorts, port)
}

func (pm *PortManager) FindMultiplePorts(count, startPort, endPort int) ([]int, error) {
	var ports []int
	currentPort := startPort

	for len(ports) < count && currentPort <= endPort {
		if pm.IsPortAvailable(currentPort) {
			pm.mu.Lock()
			pm.usedPorts[currentPort] = true
			pm.mu.Unlock()
			ports = append(ports, currentPort)
		}
		currentPort++
	}

	if len(ports) < count {
		for _, p := range ports {
			pm.ReleasePort(p)
		}
		return nil, fmt.Errorf("could not find %d available ports in range %d-%d", count, startPort, endPort)
	}

	return ports, nil
}

var defaultPortRanges = map[string][]int{
	"web":     {3000, 3001, 3002, 8000, 8001, 8002, 8080, 8081, 8082},
	"node":    {3000, 3001, 3002, 4000, 4001, 4002},
	"python":  {5000, 5001, 5002, 8000, 8001, 8002},
	"go":      {8080, 8081, 8082, 9090, 9091, 9092},
	"java":    {8080, 8081, 8082, 9090, 9091, 9092},
	"db":      {3306, 5432, 27017, 6379},
	"cache":   {6379, 6380, 6381},
	"message": {5672, 9092, 61613},
}

func GetDefaultPorts(serviceType string) []int {
	if ports, ok := defaultPortRanges[serviceType]; ok {
		return ports
	}
	return defaultPortRanges["web"]
}
