# Agent Launcher

Agent Launcher는 launch origin pane 옆에 Codex 또는 Claude Code를 실행하는 44×10 compact popup chooser입니다.

## 설치

로컬 checkout을 연결합니다.

```sh
herdr plugin link ./agent-launcher
```

GitHub에 게시된 경우에는 `herdr plugin install <owner>/<repo>/agent-launcher`를 사용합니다.
plugin은 Herdr 설정을 자동으로 수정하지 않습니다. 다음 action binding을 직접 추가할 수 있습니다.

```toml
[[keys.command]]
key = "prefix+a"
type = "plugin_action"
command = "dev.minung.agent-launcher.open"
description = "Open Agent Launcher"
```

Codex와 Claude Code가 `PATH`에 있어야 합니다. Herdr 0.7.4 이상, macOS와 Linux를 지원합니다.

## 사용법

처음에는 `Codex →`가 선택됩니다. 방향키와 Enter로 실행하거나 네 선택지를 마우스로 클릭할 수 있고, Esc로 취소합니다. 선택한 agent는 50:50으로 분할된 새 pane에서 launch origin pane의 foreground 작업 디렉터리를 상속합니다. foreground 디렉터리를 확인할 수 없으면 pane 디렉터리를 사용하며, 새 pane으로 focus가 이동합니다.

Launcher가 열린 뒤 launch origin pane이 사라져도 다른 pane으로 바꾸지 않고 오류를 표시합니다. split 후 agent 명령이 실패하면 생성된 pane은 확인과 재사용을 위해 자동으로 닫지 않습니다.
