package main

import (
	"fmt"
	"os"

	"dockdev/internal/cli"
	"dockdev/internal/config"
	"dockdev/pkg/utils"
)

func main() {
	if err := config.Init(); err != nil {
		utils.PrintWarning("Failed to initialize config: %v", err)
	}

	if err := cli.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
