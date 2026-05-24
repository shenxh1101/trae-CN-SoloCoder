package git

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/transport"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/go-git/go-git/v5/plumbing/transport/ssh"

	"dockdev/pkg/utils"
)

type CloneOptions struct {
	URL             string
	TargetDir       string
	Branch          string
	Tag             string
	Depth           int
	Username        string
	Password        string
	Token           string
	SSHKeyPath      string
	SSHPassphrase   string
	InsecureSkipTLS bool
	RecurseSubmodules bool
	Progress        chan bool
}

type CloneProgress struct {
	Stage     string
	Completed int64
	Total     int64
	Speed     string
}

type RepoInfo struct {
	URL       string
	Branch    string
	Commit    string
	Tag       string
	Remotes   []string
	Author    string
	Message   string
	Committed time.Time
}

type LanguageDetector struct {
	Primary   string
	Secondary []string
	Confidence float64
}

func Clone(opts CloneOptions) error {
	if err := utils.EnsureDir(opts.TargetDir); err != nil {
		return fmt.Errorf("failed to create target directory: %w", err)
	}

	if isNonEmptyDir(opts.TargetDir) {
		return fmt.Errorf("target directory is not empty: %s", opts.TargetDir)
	}

	cloneOpts := &git.CloneOptions{
		URL:               opts.URL,
		Depth:             opts.Depth,
		Progress:          os.Stdout,
		RecurseSubmodules: getSubmoduleRecurseOption(opts.RecurseSubmodules),
	}

	if opts.Branch != "" {
		cloneOpts.ReferenceName = plumbing.NewBranchReferenceName(opts.Branch)
	}
	if opts.Tag != "" {
		cloneOpts.ReferenceName = plumbing.NewTagReferenceName(opts.Tag)
	}

	auth, err := getAuth(opts)
	if err != nil {
		utils.PrintWarning("Authentication setup warning: %v", err)
	} else if auth != nil {
		cloneOpts.Auth = auth
	}

	if opts.InsecureSkipTLS {
		cloneOpts.InsecureSkipTLS = true
	}

	utils.PrintInfo("Cloning repository: %s", opts.URL)
	if opts.Branch != "" {
		utils.PrintInfo("Branch: %s", opts.Branch)
	}
	if opts.Tag != "" {
		utils.PrintInfo("Tag: %s", opts.Tag)
	}
	if opts.Depth > 0 {
		utils.PrintInfo("Depth: %d", opts.Depth)
	}

	if opts.Progress != nil {
		close(opts.Progress)
	}

	_, err = git.PlainClone(opts.TargetDir, false, cloneOpts)
	if err != nil {
		return handleCloneError(err, opts.URL)
	}

	utils.PrintSuccess("Repository cloned successfully to: %s", opts.TargetDir)
	return nil
}

func getAuth(opts CloneOptions) (transport.AuthMethod, error) {
	if isSSHURL(opts.URL) {
		sshKeyPath := opts.SSHKeyPath
		if sshKeyPath == "" {
			home, _ := os.UserHomeDir()
			sshKeyPath = filepath.Join(home, ".ssh", "id_rsa")
		}

		if utils.FileExists(sshKeyPath) {
			_, err := os.ReadFile(sshKeyPath)
			if err != nil {
				return nil, fmt.Errorf("failed to read SSH key: %w", err)
			}

			var auth *ssh.PublicKeys
			if opts.SSHPassphrase != "" {
				auth, err = ssh.NewPublicKeysFromFile("git", sshKeyPath, opts.SSHPassphrase)
			} else {
				auth, err = ssh.NewPublicKeysFromFile("git", sshKeyPath, "")
			}

			if err != nil {
				return nil, fmt.Errorf("failed to create SSH auth: %w", err)
			}

			utils.PrintInfo("Using SSH key authentication: %s", sshKeyPath)
			return auth, nil
		}

		return nil, errors.New("SSH key not found, please provide --ssh-key-path")
	}

	if opts.Token != "" {
		utils.PrintInfo("Using token authentication")
		return &http.BasicAuth{
			Username: "oauth2",
			Password: opts.Token,
		}, nil
	}

	if opts.Username != "" && opts.Password != "" {
		utils.PrintInfo("Using basic auth for user: %s", opts.Username)
		return &http.BasicAuth{
			Username: opts.Username,
			Password: opts.Password,
		}, nil
	}

	return nil, nil
}

func isSSHURL(url string) bool {
	return strings.HasPrefix(url, "git@") || strings.HasPrefix(url, "ssh://")
}

func getSubmoduleRecurseOption(recurse bool) git.SubmoduleRescursivity {
	if recurse {
		return 1
	}
	return git.NoRecurseSubmodules
}

func handleCloneError(err error, url string) error {
	if errors.Is(err, transport.ErrAuthenticationRequired) {
		return fmt.Errorf("authentication required for %s. Please provide --token or --ssh-key-path", url)
	}
	if errors.Is(err, transport.ErrAuthorizationFailed) {
		return fmt.Errorf("authorization failed. Please check your credentials")
	}
	if strings.Contains(err.Error(), "already exists and is not an empty directory") {
		return fmt.Errorf("target directory already exists and is not empty")
	}
	if strings.Contains(err.Error(), "remote: Repository not found") {
		return fmt.Errorf("repository not found: %s. Please check the URL and permissions", url)
	}
	return fmt.Errorf("clone failed: %w", err)
}

func isNonEmptyDir(path string) bool {
	entries, err := os.ReadDir(path)
	if err != nil {
		return false
	}
	return len(entries) > 0
}

func GetRepoInfo(repoPath string) (*RepoInfo, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	head, err := repo.Head()
	if err != nil {
		return nil, fmt.Errorf("failed to get HEAD: %w", err)
	}

	remotes, err := repo.Remotes()
	if err != nil {
		return nil, fmt.Errorf("failed to get remotes: %w", err)
	}

	var remoteURLs []string
	for _, r := range remotes {
		remoteURLs = append(remoteURLs, r.Config().URLs...)
	}

	commit, err := repo.CommitObject(head.Hash())
	if err != nil {
		return nil, fmt.Errorf("failed to get commit: %w", err)
	}

	info := &RepoInfo{
		URL:       remoteURLs[0],
		Commit:    head.Hash().String(),
		Branch:    head.Name().Short(),
		Remotes:   remoteURLs,
		Author:    commit.Author.Name,
		Message:   commit.Message,
		Committed: commit.Committer.When,
	}

	if head.Name().IsTag() {
		info.Tag = head.Name().Short()
	}

	return info, nil
}

func Pull(repoPath string) error {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	wt, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	utils.PrintInfo("Pulling latest changes...")
	err = wt.Pull(&git.PullOptions{
		Progress: os.Stdout,
	})
	if err != nil {
		if errors.Is(err, git.NoErrAlreadyUpToDate) {
			utils.PrintInfo("Already up to date")
			return nil
		}
		return fmt.Errorf("pull failed: %w", err)
	}

	utils.PrintSuccess("Pull completed successfully")
	return nil
}

func Fetch(repoPath string) error {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}

	utils.PrintInfo("Fetching remote updates...")
	err = repo.Fetch(&git.FetchOptions{
		Progress: os.Stdout,
	})
	if err != nil {
		if errors.Is(err, git.NoErrAlreadyUpToDate) {
			utils.PrintInfo("Already up to date")
			return nil
		}
		return fmt.Errorf("fetch failed: %w", err)
	}

	utils.PrintSuccess("Fetch completed successfully")
	return nil
}

func ListBranches(repoPath string) ([]string, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	branches, err := repo.Branches()
	if err != nil {
		return nil, fmt.Errorf("failed to get branches: %w", err)
	}

	var branchNames []string
	err = branches.ForEach(func(ref *plumbing.Reference) error {
		branchNames = append(branchNames, ref.Name().Short())
		return nil
	})
	if err != nil {
		return nil, err
	}

	return branchNames, nil
}

func ListTags(repoPath string) ([]string, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	tags, err := repo.Tags()
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	var tagNames []string
	err = tags.ForEach(func(ref *plumbing.Reference) error {
		tagNames = append(tagNames, ref.Name().Short())
		return nil
	})
	if err != nil {
		return nil, err
	}

	return tagNames, nil
}

func DetectLanguage(repoPath string) *LanguageDetector {
	detector := &LanguageDetector{}

	patterns := map[string][]string{
		"nodejs":    {"package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.json"},
		"python":    {"requirements.txt", "pyproject.toml", "setup.py", "Pipfile", "poetry.lock"},
		"go":        {"go.mod", "go.sum", "glide.yaml", "Gopkg.toml"},
		"java":      {"pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "gradlew"},
		"rust":      {"Cargo.toml", "Cargo.lock"},
		"ruby":      {"Gemfile", "Gemfile.lock", "Rakefile"},
		"php":       {"composer.json", "composer.lock", "index.php"},
		"dotnet":    {"*.csproj", "*.sln", "global.json"},
		"javascript": {"package.json", "*.js", "*.jsx"},
		"typescript": {"tsconfig.json", "*.ts", "*.tsx"},
	}

	scores := make(map[string]int)
	foundFiles := make(map[string]bool)

	err := filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			name := filepath.Base(path)
			if name == "node_modules" || name == ".git" || name == "venv" || name == ".venv" || name == "vendor" {
				return filepath.SkipDir
			}
			return nil
		}

		filename := filepath.Base(path)
		for lang, files := range patterns {
			for _, pattern := range files {
				if matched, _ := filepath.Match(pattern, filename); matched {
					scores[lang]++
					foundFiles[filename] = true
				}
			}
		}
		return nil
	})
	if err != nil {
		detector.Primary = "nodejs"
		return detector
	}

	maxScore := 0
	totalScore := 0
	for lang, score := range scores {
		totalScore += score
		if score > maxScore {
			maxScore = score
			detector.Primary = lang
		}
	}

	for lang, score := range scores {
		if lang != detector.Primary && score > 0 {
			detector.Secondary = append(detector.Secondary, lang)
		}
	}

	if totalScore > 0 {
		detector.Confidence = float64(maxScore) / float64(totalScore)
	}

	if detector.Primary == "" {
		detector.Primary = "nodejs"
		detector.Confidence = 0.1
	}

	return detector
}

func GetRemoteBranches(url string, opts CloneOptions) ([]string, error) {
	remoteConfig := &config.RemoteConfig{
		Name: "origin",
		URLs: []string{url},
	}

	remote := git.NewRemote(nil, remoteConfig)

	auth, err := getAuth(opts)
	if err != nil {
		auth = nil
	}

	listOpts := &git.ListOptions{}
	if auth != nil {
		listOpts.Auth = auth
	}

	refs, err := remote.List(listOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to list remote branches: %w", err)
	}

	var branches []string
	for _, ref := range refs {
		if ref.Name().IsBranch() {
			branches = append(branches, ref.Name().Short())
		}
	}

	return branches, nil
}
