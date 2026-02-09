# MCP_ClaudeOps

Claude Code 운영 대시보드 - 세션 모니터링, 에이전트 성능 분석, 비용 추적, 칸반 보드를 제공하는 MCP 서버

## 주요 기능

- **실시간 모니터링** - 세션, 에이전트, 도구 사용 실시간 추적
- **비용 분석** - 모델별 토큰 사용량 및 비용 시각화, 예산 알림
- **칸반 보드** - 5-컬럼 드래그 앤 드롭 태스크 관리
- **31개 MCP 도구** - Claude Code 대화 중 직접 데이터 조회/관리
- **8개 Hook 자동 수집** - 세션/도구/에이전트/프롬프트 이벤트 자동 기록
- **한글 대시보드** - 전체 UI 한국어 지원

## 아키텍처

```
Claude Code
├── 8 Hooks ──────► Backend API (:48390)
│                   ├── Fastify + WebSocket
│                   └── SQLite DB (~/.claudeops/claudeops.db)
└── 31 MCP Tools ──► MCP Server (stdio)
                         │
                         └──► Backend API

Dashboard (:48391) ◄── WebSocket ── Backend
├── Next.js 15 + React 19
├── Tailwind CSS v4
└── 실시간 업데이트
```

### 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `@claudeops/shared` | 공유 타입, 상수, 유틸리티 |
| `@claudeops/backend` | Fastify REST API + WebSocket 서버 |
| `@claudeops/mcp-server` | MCP 프로토콜 서버 (31개 도구) |
| `@claudeops/dashboard` | Next.js 15 운영 대시보드 |
| `@claudeops/cli` | 서비스 관리 CLI |

## 요구사항

- **Node.js** >= 20.0.0
- **pnpm** >= 9.x

## 설치

### 1. 클론 및 빌드

```bash
git clone https://github.com/<your-username>/MCP_ClaudeOps.git
cd MCP_ClaudeOps
pnpm install
pnpm turbo run build
```

### 2. 자동 설치 (권장)

모니터링할 프로젝트 디렉토리에서 실행합니다:

```bash
cd /path/to/your-project
node /path/to/MCP_ClaudeOps/packages/cli/dist/index.js setup
```

이 명령 하나로 다음이 자동 수행됩니다:

1. 모든 패키지 빌드
2. Backend 서비스 시작 (`:48390`)
3. Dashboard 서비스 시작 (`:48391`)
4. MCP 서버를 `.claude/settings.local.json`에 등록
5. 8개 Hook 설치

완료 후 **Claude Code를 재시작**하면 MCP 서버와 Hook이 활성화됩니다.

### 3. 수동 설치

자동 설치 대신 직접 설정하려면:

#### 서비스 시작

```bash
# Backend
node /path/to/MCP_ClaudeOps/packages/backend/dist/index.js &

# Dashboard
cd /path/to/MCP_ClaudeOps/packages/dashboard
npx next start --port 48391 &
```

#### MCP 서버 등록

프로젝트의 `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "claudeops": {
      "command": "node",
      "args": ["/path/to/MCP_ClaudeOps/packages/mcp-server/dist/index.js"],
      "env": {
        "CLAUDEOPS_BACKEND_URL": "http://localhost:48390"
      }
    }
  }
}
```

#### Hook 등록

동일한 `.claude/settings.local.json`에 hooks 추가:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||require('crypto').randomUUID();fetch('http://localhost:48390/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sid,project_path:d.cwd||process.cwd()}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "SessionEnd": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/sessions/'+sid,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({end_time:new Date().toISOString(),status:'completed'}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "PreToolUse": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call_start',payload:{tool_name:d.tool_name}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "PostToolUse": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call_end',payload:{tool_name:d.tool_name,duration_ms:d.duration_ms,success:true}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "SubagentStart": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/agents/executions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,agent_type:d.agent_type||'unknown',model:d.model||'unknown',task_description:d.task_description}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "SubagentStop": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_stop',payload:d}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "UserPromptSubmit": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'user_prompt',payload:{prompt_length:d.prompt?d.prompt.length:0}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }],
    "Stop": [{
      "hooks": [{"type": "command", "command": "node -e \"const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('http://localhost:48390/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'stop',payload:{reason:d.reason||'unknown'}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))\""}]
    }]
  }
}
```

## 다중 프로젝트 모니터링

하나의 ClaudeOps 인스턴스로 여러 프로젝트를 모니터링할 수 있습니다:

```bash
# 프로젝트 A
cd /path/to/project-a
node /path/to/MCP_ClaudeOps/packages/cli/dist/index.js setup

# 프로젝트 B (서비스는 재사용, Hook/MCP만 등록)
cd /path/to/project-b
node /path/to/MCP_ClaudeOps/packages/cli/dist/index.js setup
```

## CLI 명령어

```bash
claudeops setup        # 전체 설치 (빌드 + 서비스 + MCP + Hook)
claudeops start        # 서비스 시작 (all | backend | dashboard)
claudeops stop         # 서비스 종료
claudeops status       # 서비스 상태 확인
claudeops teardown     # 서비스 중지 + 등록 해제

claudeops task create "제목" --priority P1 --label feature
claudeops task list --status in_progress
claudeops task update <id> --status done
claudeops task board   # 터미널 칸반 보드
claudeops task link <task_id> <session_id>
```

## MCP 도구 (31개)

| 카테고리 | 도구 |
|----------|------|
| **세션** | create_session, end_session, get_session, list_sessions, search_sessions |
| **에이전트** | record_agent, list_agents, get_agent_performance |
| **이벤트** | record_event, list_events, get_event_timeline |
| **분석** | record_token_usage, get_token_summary, get_cost_analysis, get_dashboard_summary, analyze_session_patterns |
| **설정** | get_config, update_config, set_budget_alert, check_budget |
| **내보내기** | export_data |
| **시스템** | health_check, get_service_status, get_system_info, cleanup_old_data |
| **태스크** | create_task, update_task, list_tasks, move_task, get_task_board, link_session_to_task |

모든 도구는 `claudeops_` 접두사로 시작합니다 (예: `claudeops_create_session`).

## 대시보드

`http://localhost:48391`

| 페이지 | 설명 |
|--------|------|
| `/` | 대시보드 - 오늘 요약 + 모델별 비용 차트 + 태스크 통계 |
| `/sessions` | 세션 목록 |
| `/sessions/[id]` | 세션 상세 (에이전트, 이벤트 타임라인) |
| `/agents` | 에이전트 성능 (호출 수, 평균 소요 시간, 성공률) |
| `/tokens` | 토큰 & 비용 (입력/출력, 예산 현황, 모델별) |
| `/tools` | 도구 분석 |
| `/events` | 실시간 이벤트 |
| `/tasks` | 칸반 보드 (백로그/할 일/진행 중/리뷰/완료) |
| `/tasks/[id]` | 태스크 상세 + 변경 이력 |
| `/settings` | 모델 가격 설정, 예산 알림 |

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `CLAUDEOPS_BACKEND_PORT` | `48390` | Backend API 포트 |
| `CLAUDEOPS_DASHBOARD_PORT` | `48391` | Dashboard 포트 |
| `CLAUDEOPS_BACKEND_URL` | `http://localhost:48390` | MCP 서버 → Backend 연결 URL |
| `CLAUDEOPS_DATA_DIR` | `~/.claudeops` | 데이터 디렉토리 (SQLite DB) |

## 제거

```bash
cd /path/to/your-project
node /path/to/MCP_ClaudeOps/packages/cli/dist/index.js teardown
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 빌드 | pnpm + Turborepo |
| Backend | Fastify 5, @fastify/websocket, better-sqlite3 |
| MCP | @modelcontextprotocol/sdk |
| Dashboard | Next.js 15, React 19, Tailwind CSS v4, Zustand 5, React Query 5, Recharts |
| CLI | Commander.js |
| 언어 | TypeScript 5.7 |

## 라이선스

MIT
