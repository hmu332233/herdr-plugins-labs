# Space Stats

[English](./README.md) | [한국어](./README.ko.md)

각 Herdr workspace의 tab, pane, 감지된 agent 수를 확장된 Space 사이드바에서
사용할 수 있는 `$space_stats` 커스텀 토큰 하나로 제공합니다.

토큰은 `3t(5p) · 2 agents` 형식으로 표시됩니다.

![Space Stats 사이드바 예시](./assets/example.png)

## 요구 사항

- Herdr 0.7.4 이상
- Node.js 18 이상

## 로컬 개발용 링크

이 디렉터리에서 다음 명령을 실행합니다.

```sh
herdr plugin link "$PWD"
herdr plugin action invoke dev.minung.space-stats.sync
```

`sync` action은 열려 있는 모든 workspace를 초기화합니다. Herdr 0.7.4에는
플러그인 시작 이벤트가 없으므로 플러그인을 링크한 뒤 한 번, Herdr 서버를
재시작한 뒤 다시 한 번 실행해야 합니다.

## 사이드바 설정

Herdr 설정의 Space row에 `$space_stats`를 추가합니다.

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace"],
  ["$space_stats"],
]
```

Metadata reporter는 값만 제공하므로 플러그인이 사이드바 설정을 수정하지는
않습니다.

## 자동 갱신

pane이 생성, 종료, 이동되거나 pane 프로세스가 끝날 때, 감지된 agent가 나타나거나
사라질 때, tab이 닫힐 때 모든 workspace 요약을 갱신합니다. 새 tab 생성은 함께
발생하는 `pane.created` 이벤트로 처리합니다.

각 갱신은 별도 카운터를 관리하지 않고 Herdr의 현재 상태를 읽습니다. 동시에 실행된
이전 갱신이 최신 값을 덮어쓰지 않도록 Herdr metadata sequence를 사용합니다.

## 테스트

```sh
node --test
```
