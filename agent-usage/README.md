# Agent Usage

Claude Code, Codex CLI, Codex2의 5시간 사용량을 읽어 Herdr tab bar의 right status area에 표시합니다. 각 항목은 10칸 미터, 사용률, 리셋까지 남은 시간으로 구성됩니다.

![Herdr right bar 실제 출력](./assets/example.png)

## 요구 사항

- Python 3
- Claude Code 사용량을 위한 `claude-hud`
- Codex와 Codex2의 session log

외부 Python package는 필요하지 않습니다. 스크립트는 네트워크나 자격증명에 접근하지 않고 로컬 cache와 session log만 읽습니다.

## 사용

기본 실행은 Herdr right status의 80자 제한에 맞춰 5시간 사용량만 표시합니다.

```sh
./aiusage
```

`CL`, `CX`, `CX2`는 각각 Claude, Codex, Codex2를 뜻합니다. 괄호 안 값은 해당 5시간 창이 리셋될 때까지 남은 시간입니다. 리셋 시각이 지난 snapshot은 `3h ago`처럼 경과 시간을 표시합니다.

주간 사용량까지 확인하려면 `--weekly`를 추가합니다. 세 서비스의 주간 정보를 모두 표시하면 80자를 넘으므로 이 형식은 터미널에서 직접 확인할 때 사용합니다.

```sh
./aiusage --weekly
```

## Herdr 설정

`~/.config/herdr/config.toml`의 `[ui]` section에 command entry를 추가합니다. `/absolute/path/to/agent-usage/aiusage`는 실제 checkout 경로로 바꿉니다.

```toml
[ui]
tab_bar_right = [
  { type = "command", command = "/absolute/path/to/agent-usage/aiusage", interval_seconds = 60, timeout_seconds = 2 },
]
```

Herdr를 다시 시작하거나 다음 명령으로 설정을 다시 읽습니다.

```sh
herdr server reload-config
```

## 데이터와 갱신 동작

Claude 사용량은 `~/.claude/plugins/claude-hud/.usage-cache.json`에서 읽습니다. Codex와 Codex2 사용량은 각각 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`과 `~/.codex2/sessions/YYYY/MM/DD/rollout-*.jsonl`의 최신 `rate_limits`에서 읽습니다.

모든 값은 마지막으로 기록된 snapshot이므로 실제 사용량보다 오래된 값일 수 있습니다. 데이터가 없으면 해당 항목에 `—`를 표시합니다.
