# MCP_ClaudeOps

Claude Code 운영 대시보드 - 세션 모니터링, 에이전트 성능 분석, 비용 추적, 프로젝트 관리, GitHub 동기화를 제공하는 MCP 서버

## 주요 기능

- **실시간 모니터링** - 세션, 에이전트, 도구 사용 실시간 추적
- **비용 분석** - 모델별 토큰 사용량 및 비용 시각화, 예산 알림
- **프로젝트 관리** - PRD → Epic → Task 계층적 추적, 칸반 보드
- **에이전트 팀** - 페르소나 기반 팀 구성, 역할 배정, 워크로드 추적, 템플릿
- **파이프라인 실행** - 다단계 에이전트 파이프라인 설계/실행/모니터링
- **태스크 워크플로우** - 설계(Design) → 승인 → 구현 → 검증 자동화
- **GitHub 동기화** - Epic/Task → GitHub Issue 양방향 동기화, 리포트 댓글 게시
- **Worktree 격리** - Git Worktree 기반 Epic별 병렬 개발 환경
- **프로젝트 컨텍스트** - brief/tech/architecture/rules 문서 관리
- **세션 리포트** - 자동 세션 리포트 및 일일 스탠드업 생성
- **89개 MCP 도구** - Claude Code 대화 중 직접 데이터 조회/관리
- **8개 Hook 자동 수집** - 세션/도구/에이전트/프롬프트 이벤트 자동 기록
- **한글 대시보드** - 전체 UI 한국어 지원

## 아키텍처

```
Claude Code
├── 8 Hooks ──────► Backend API (:48390)
│                   ├── Fastify + WebSocket
│                   ├── SQLite DB (~/.claudeops/claudeops.db)
│                   └── GitHub CLI (gh) ── GitHub Issues
└── 89 MCP Tools ──► MCP Server (stdio)
                         │
                         └──► Backend API

Dashboard (:48391) ◄── WebSocket ── Backend
├── Next.js 16 + React 19
├── Tailwind CSS v4
└── 19페이지 실시간 대시보드
```

### 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `@claudeops/shared` | 공유 타입, 상수, 유틸리티 |
| `@claudeops/backend` | Fastify REST API + WebSocket 서버 |
| `@claudeops/mcp-server` | MCP 프로토콜 서버 (89개 도구) |
| `@claudeops/dashboard` | Next.js 16 운영 대시보드 |
| `@claudeops/cli` | 서비스 관리 CLI |

## 요구사항

- **Node.js** >= 20.0.0
- **pnpm** >= 9.x

## 설치

### 빠른 설치 (권장)

```bash
curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP_ClaudeOps/main/install.sh | bash
```

설치 후 모니터링할 프로젝트에서:

```bash
cd /path/to/your-project
claudeops setup
```

이 명령 하나로 다음이 자동 수행됩니다:

1. 모든 패키지 빌드
2. Backend 서비스 시작 (`:48390`)
3. Dashboard 서비스 시작 (`:48391`)
4. MCP 서버를 `.claude/settings.local.json`에 등록
5. 8개 Hook 설치

완료 후 **Claude Code를 재시작**하면 MCP 서버와 Hook이 활성화됩니다.

### 수동 설치

```bash
git clone https://github.com/skdkfk8758/MCP_ClaudeOps.git
cd MCP_ClaudeOps
pnpm install
pnpm turbo run build
```

모니터링할 프로젝트에서:

```bash
cd /path/to/your-project
node /path/to/MCP_ClaudeOps/packages/cli/dist/index.js setup
```

### 다중 프로젝트 모니터링

하나의 ClaudeOps 인스턴스로 여러 프로젝트를 모니터링할 수 있습니다:

```bash
# 프로젝트 A
cd /path/to/project-a
claudeops setup

# 프로젝트 B (서비스는 재사용, Hook/MCP만 등록)
cd /path/to/project-b
claudeops setup
```

## 업데이트

### 빠른 업데이트

```bash
claudeops upgrade
```

이 명령 하나로 다음이 자동 수행됩니다:

1. 최신 소스 코드 pull (`git pull --ff-only`)
2. 의존성 설치 및 모든 패키지 재빌드
3. DB 스키마 마이그레이션 (새 테이블 자동 생성)
4. 등록된 모든 프로젝트의 MCP 서버/Hook 경로 갱신
5. 서비스 재시작

```bash
claudeops upgrade          # 글로벌 + 모든 등록 프로젝트 업데이트
claudeops upgrade --global # 글로벌 설치만 업데이트 (빌드 + DB + 서비스 재시작)
claudeops upgrade --db     # DB 마이그레이션만 실행
```

### 수동 업데이트

```bash
# 1. 글로벌 업데이트
cd ~/.claudeops-install
git pull
pnpm install && pnpm turbo run build

# 2. 서비스 재시작
claudeops stop
claudeops start

# 3. 각 프로젝트에서 재설정
cd /path/to/your-project
claudeops setup
```

### 등록된 프로젝트 확인

```bash
claudeops list
```

`claudeops setup`을 실행한 프로젝트는 자동으로 `~/.claudeops/projects.json`에 등록됩니다.
`claudeops upgrade` 시 이 목록의 모든 프로젝트가 자동으로 재설정됩니다.

## CLI 명령어

```bash
claudeops setup        # 전체 설치 (빌드 + 서비스 + MCP + Hook)
claudeops start        # 서비스 시작 (all | backend | dashboard)
claudeops stop         # 서비스 종료
claudeops status       # 서비스 상태 확인
claudeops teardown     # 서비스 중지 + 등록 해제
claudeops upgrade      # 글로벌 업데이트 + 등록 프로젝트 재설정
claudeops list         # 등록된 프로젝트 목록 조회

claudeops task create "제목" --priority P1 --label feature
claudeops task list --status implementation
claudeops task update <id> --status done
claudeops task board   # 터미널 칸반 보드
claudeops task link <task_id> <session_id>

claudeops prd create "제목" --vision "비전"
claudeops prd list
claudeops prd show <id>

claudeops epic create "제목" --prd <prd_id>
claudeops epic list [--prd <prd_id>]
claudeops epic show <id>

claudeops report session <session_id>
claudeops report standup [--date 2026-02-09]

claudeops github config          # GitHub 설정 조회
claudeops github setup           # GitHub 연결 설정
claudeops github sync epic <id>  # Epic → GitHub Issue 동기화
claudeops github sync task <id>  # Task → GitHub Issue 동기화

claudeops worktree create <name> --project <path> [--epic <id>]
claudeops worktree list [--status <status>]
claudeops worktree merge <id>
claudeops worktree remove <id>
claudeops worktree context set --project <path> --type <type> --title <title> --content <content>
claudeops worktree context get --project <path> [--type <type>]
```

## MCP 도구 (89개)

| 카테고리 | 도구 | 수 |
|----------|------|----|
| **세션** | create_session, end_session, get_session, list_sessions, search_sessions | 5 |
| **에이전트** | record_agent, list_agents, get_agent_performance, get_agent_stats | 4 |
| **이벤트** | record_event, list_events, get_event_timeline, record_tool_use, list_tool_events, get_tool_stats, record_prompt | 7 |
| **분석** | record_token_usage, get_token_summary, get_cost_analysis, get_dashboard_summary, analyze_session_patterns, get_model_costs, get_budget_status | 7 |
| **설정** | get_config, update_config, set_budget_alert, check_budget, set_model_price, get_system_info | 6 |
| **태스크** | create_task, update_task, list_tasks, move_task, get_task_board, link_session_to_task, set_task_branch, execute_task, design_task, approve_design, implement_task, verify_task, get_verification, scan_task_commits, get_task_commits, auto_branch, get_scope_proposal, scope_split | 18 |
| **PRD** | create_prd, list_prds, update_prd | 3 |
| **에픽** | create_epic, list_epics, update_epic, get_epic, link_epic_tasks | 5 |
| **파이프라인** | create_pipeline, list_pipelines, get_pipeline, execute_pipeline, cancel_pipeline, get_pipeline_status, get_presets | 7 |
| **팀/페르소나** | list_personas, create_persona, update_persona, delete_persona, create_team, list_teams, get_team, clone_team, archive_team, add_agent_to_team, remove_agent_from_team, assign_team_to_task, unassign_team_from_task, list_team_templates, get_workload | 15 |
| **리포트** | generate_session_report, generate_standup | 2 |
| **GitHub** | sync_epic_to_github, sync_task_to_github, post_report_to_github, get_github_config, setup_github, sync_all | 6 |
| **Worktree** | create_worktree, list_worktrees, merge_worktree, set_project_context, get_project_context | 5 |
| **프로젝트** | resolve_project_path | 1 |

모든 도구는 `claudeops_` 접두사로 시작합니다 (예: `claudeops_create_session`).

## 대시보드 (19페이지)

`http://localhost:48391`

| 페이지 | 설명 |
|--------|------|
| `/` | 대시보드 - 오늘 요약 + 모델별 비용 차트 + PRD/Epic 통계 |
| `/sessions` | 세션 목록 |
| `/sessions/[id]` | 세션 상세 (에이전트, 이벤트 타임라인) |
| `/agents` | 에이전트 성능 (호출 수, 평균 소요 시간, 성공률) |
| `/tokens` | 토큰 & 비용 (입력/출력, 예산 현황, 모델별) |
| `/tools` | 도구 분석 |
| `/events` | 실시간 이벤트 |
| `/tasks` | 칸반 보드 (백로그/할 일/진행 중/리뷰/완료) + Epic/팀 필터 |
| `/tasks/[id]` | 태스크 상세 + 설계/구현/검증 워크플로우 + 팀 배정 |
| `/pipelines` | 파이프라인 목록 + 프리셋 템플릿 |
| `/pipelines/[id]` | 파이프라인 편집기 (React Flow) + 실행 모니터링 |
| `/teams` | 에이전트 팀 관리 (페르소나, 역할 배정, 워크로드) |
| `/prds` | PRD 목록 (상태 필터, 카드 뷰) |
| `/prds/[id]` | PRD 상세 + 연결된 Epic 목록 |
| `/epics` | Epic 목록 (진행률 바, PRD 링크) |
| `/epics/[id]` | Epic 상세 + 하위 Task 목록 |
| `/reports` | 세션 리포트 + 스탠드업 생성 |
| `/worktrees` | Worktree 관리 (생성/병합/제거, Epic 연결) |
| `/settings` | 모델 가격, 예산 알림, GitHub 설정, 프로젝트 컨텍스트 |

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CLAUDEOPS_BACKEND_PORT` | `48390` | Backend API 포트 |
| `CLAUDEOPS_DASHBOARD_PORT` | `48391` | Dashboard 포트 |
| `CLAUDEOPS_BACKEND_URL` | `http://localhost:48390` | MCP 서버 → Backend 연결 URL |
| `CLAUDEOPS_HOME` | `~/.claudeops-install` | ClaudeOps 설치 디렉토리 |
| `CLAUDEOPS_DATA_DIR` | `~/.claudeops` | 데이터 디렉토리 (SQLite DB) |

## 제거

```bash
cd /path/to/your-project
claudeops teardown
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 빌드 | pnpm + Turborepo |
| Backend | Fastify 5, @fastify/websocket, better-sqlite3 |
| MCP | @modelcontextprotocol/sdk |
| Dashboard | Next.js 16, React 19, Tailwind CSS v4, React Query 5, @xyflow/react, Recharts |
| CLI | Commander.js |
| 언어 | TypeScript 5.9 |

## 라이선스

MIT
