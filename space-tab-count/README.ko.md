# Space Tab Count

[English](./README.md) | [한국어](./README.ko.md)

Herdr 서버가 관리하는 workspace의 `tab_count` 값을 확장된 Space 사이드바에서
사용할 수 있는 `$tab_count` 커스텀 토큰으로 제공합니다.

## 요구 사항

- Herdr 0.7.4 이상
- Node.js 18 이상

## 로컬 개발용 링크

이 디렉터리에서 다음 명령을 실행합니다.

```sh
herdr plugin link "$PWD"
herdr plugin action invoke dev.minung.space-tab-count.sync
```

`sync` action은 열려 있는 모든 workspace를 초기화합니다. 이후에는 tab이
생성되거나 닫힐 때 모든 workspace의 토큰을 자동으로 갱신합니다.

## 사이드바 설정

Herdr 설정의 Space row에 `$tab_count`를 추가합니다.

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace", "$tab_count"],
  ["branch", "git_status"],
]
```

토큰은 `repo · 3`처럼 단위 없는 숫자로 표시됩니다. Metadata reporter는 사이드바
row를 변경할 수 없으므로 플러그인을 설치해도 Herdr 설정은 자동으로 수정되지
않습니다.

## 이벤트와 재시작 동작

플러그인은 `tab.created`와 `tab.closed` 이벤트를 수신합니다. 각 이벤트에서는
별도의 카운터를 관리하지 않고 Herdr의 현재 `tab_count` 값들을 읽습니다.

Workspace metadata는 Herdr 서버를 재시작한 뒤 복원되지 않습니다. 재시작 후에는
다음 sync action을 다시 실행합니다.

```sh
herdr plugin action invoke dev.minung.space-tab-count.sync
```

## 테스트

```sh
node --test
```
