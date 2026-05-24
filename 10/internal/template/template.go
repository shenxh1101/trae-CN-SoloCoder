package template

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"text/template"

	"dockdev/pkg/utils"
)

//go:embed templates/nodejs/Dockerfile
var nodejsDockerfile string

//go:embed templates/nodejs/docker-compose.yml
var nodejsCompose string

//go:embed templates/python/Dockerfile
var pythonDockerfile string

//go:embed templates/python/docker-compose.yml
var pythonCompose string

//go:embed templates/go/Dockerfile
var goDockerfile string

//go:embed templates/go/docker-compose.yml
var goCompose string

//go:embed templates/java/Dockerfile
var javaDockerfile string

//go:embed templates/java/docker-compose.yml
var javaCompose string

type TemplateData struct {
	ProjectName string
	AppPort     int
	DbPort      int
	CachePort   int
	NodeVersion string
	PythonVersion string
	GoVersion   string
	JavaVersion string
	DbType      string
	CacheType   string
}

type Template struct {
	Name        string
	Description string
	Dockerfile  string
	Compose     string
	DefaultPorts map[string]int
}

var templates = map[string]*Template{
	"nodejs": {
		Name:        "nodejs",
		Description: "Node.js development environment",
		Dockerfile:  nodejsDockerfile,
		Compose:     nodejsCompose,
		DefaultPorts: map[string]int{
			"app":   3000,
			"db":    5432,
			"cache": 6379,
		},
	},
	"python": {
		Name:        "python",
		Description: "Python development environment",
		Dockerfile:  pythonDockerfile,
		Compose:     pythonCompose,
		DefaultPorts: map[string]int{
			"app":   8000,
			"db":    5432,
			"cache": 6379,
		},
	},
	"go": {
		Name:        "go",
		Description: "Go development environment",
		Dockerfile:  goDockerfile,
		Compose:     goCompose,
		DefaultPorts: map[string]int{
			"app":   8080,
			"db":    5432,
			"cache": 6379,
		},
	},
	"java": {
		Name:        "java",
		Description: "Java development environment",
		Dockerfile:  javaDockerfile,
		Compose:     javaCompose,
		DefaultPorts: map[string]int{
			"app":   8080,
			"db":    5432,
			"cache": 6379,
		},
	},
}

func ListTemplates() []*Template {
	var list []*Template
	for _, t := range templates {
		list = append(list, t)
	}
	return list
}

func GetTemplate(name string) (*Template, error) {
	t, ok := templates[name]
	if !ok {
		return nil, fmt.Errorf("template not found: %s", name)
	}
	return t, nil
}

func Render(templateName, targetDir string, data TemplateData) error {
	t, err := GetTemplate(templateName)
	if err != nil {
		return err
	}

	if err := utils.EnsureDir(targetDir); err != nil {
		return err
	}

	if err := renderTemplate(t.Dockerfile, filepath.Join(targetDir, "Dockerfile"), data); err != nil {
		return err
	}

	if err := renderTemplate(t.Compose, filepath.Join(targetDir, "docker-compose.yml"), data); err != nil {
		return err
	}

	return nil
}

func renderTemplate(content, target string, data TemplateData) error {
	tmpl, err := template.New("template").Parse(content)
	if err != nil {
		return err
	}

	f, err := os.Create(target)
	if err != nil {
		return err
	}
	defer f.Close()

	return tmpl.Execute(f, data)
}
