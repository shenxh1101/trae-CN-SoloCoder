package handlers

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	sseClients = make(map[chan string]bool)
	sseMu      sync.RWMutex
)

func SSEStream(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := make(chan string, 10)
	sseMu.Lock()
	sseClients[clientChan] = true
	sseMu.Unlock()

	defer func() {
		sseMu.Lock()
		delete(sseClients, clientChan)
		sseMu.Unlock()
		close(clientChan)
	}()

	c.Stream(func(w http.ResponseWriter) bool {
		if msg, ok := <-clientChan; ok {
			fmt.Fprintf(w, "data: %s\n\n", msg)
			return true
		}
		return false
	})
}

func BroadcastWinRecord(msg string) {
	sseMu.RLock()
	defer sseMu.RUnlock()

	log.Printf("Broadcasting to %d clients: %s", len(sseClients), msg)

	for client := range sseClients {
		select {
		case client <- msg:
		default:
			sseMu.RUnlock()
			sseMu.Lock()
			delete(sseClients, client)
			sseMu.Unlock()
			sseMu.RLock()
		}
	}
}
