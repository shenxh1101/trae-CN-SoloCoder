package utils

import "github.com/fatih/color"

var (
	Green   = color.New(color.FgGreen).SprintFunc()
	Red     = color.New(color.FgRed).SprintFunc()
	Yellow  = color.New(color.FgYellow).SprintFunc()
	Blue    = color.New(color.FgBlue).SprintFunc()
	Cyan    = color.New(color.FgCyan).SprintFunc()
	Magenta = color.New(color.FgMagenta).SprintFunc()
	White   = color.New(color.FgWhite).SprintFunc()
	Bold    = color.New(color.Bold).SprintFunc()
)

var ContainerColors = []func(a ...interface{}) string{
	color.New(color.FgGreen).SprintFunc(),
	color.New(color.FgYellow).SprintFunc(),
	color.New(color.FgBlue).SprintFunc(),
	color.New(color.FgMagenta).SprintFunc(),
	color.New(color.FgCyan).SprintFunc(),
	color.New(color.FgRed).SprintFunc(),
	color.New(color.FgHiGreen).SprintFunc(),
	color.New(color.FgHiYellow).SprintFunc(),
	color.New(color.FgHiBlue).SprintFunc(),
	color.New(color.FgHiMagenta).SprintFunc(),
}

func GetContainerColor(index int) func(a ...interface{}) string {
	return ContainerColors[index%len(ContainerColors)]
}

var (
	Grey = color.New(color.FgHiBlack).SprintFunc()
)

