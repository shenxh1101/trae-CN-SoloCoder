package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var completionCmd = &cobra.Command{
	Use:   "completion [bash|zsh|fish|powershell]",
	Short: "Generate shell completion script",
	Long: `Generate shell completion script for dockdev.

To load completions:

Bash:

  $ dockdev completion bash > /etc/bash_completion.d/dockdev
  # or
  $ source <(dockdev completion bash)

Zsh:

  $ dockdev completion zsh > "${fpath[1]}/_dockdev"
  # or
  $ echo "autoload -U compinit; compinit" >> ~/.zshrc
  $ echo "source <(dockdev completion zsh)" >> ~/.zshrc

Fish:

  $ dockdev completion fish > ~/.config/fish/completions/dockdev.fish

PowerShell:

  PS> dockdev completion powershell > dockdev.ps1
  PS> .\dockdev.ps1
`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		shell := args[0]
		var err error

		switch shell {
		case "bash":
			err = rootCmd.GenBashCompletion(os.Stdout)
		case "zsh":
			err = rootCmd.GenZshCompletion(os.Stdout)
		case "fish":
			err = rootCmd.GenFishCompletion(os.Stdout, true)
		case "powershell":
			err = rootCmd.GenPowerShellCompletionWithDesc(os.Stdout)
		default:
			return fmt.Errorf("unsupported shell: %s", shell)
		}

		return err
	},
}

func init() {
	rootCmd.AddCommand(completionCmd)
}
