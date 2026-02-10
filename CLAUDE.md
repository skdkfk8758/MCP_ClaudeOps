# MCP_ClaudeOps 프로젝트 지침

## 프로젝트 개요
- pnpm monorepo + Turborepo (5 패키지)
- 기술 스택: Next.js 16, React 19, Fastify 5, better-sqlite3, @xyflow/react, Tailwind CSS 4, TypeScript 5.9
- 빌드: `pnpm turbo run build`
- 테스트: `pnpm --filter <pkg> test:coverage` (80% 임계값)

## Obsidian AIBrain 참조 (필수)
세션 시작 시 작업 도메인에 맞는 Obsidian 노트를 읽을 것:
- 항상: `AIBrain/01-Base/Core-Protocol.md`
- Frontend: `AIBrain/01-Base/Best-Practices/React.md`, `TypeScript.md`
- Testing: `AIBrain/01-Base/Best-Practices/Testing.md`
- 코드 품질: `AIBrain/01-Base/Best-Practices/Code-Quality.md`
- 디버깅: `AIBrain/01-Base/Best-Practices/Debugging.md`
- Plan Mode: `AIBrain/01-Base/Best-Practices/Plan-Mode-Review.md`
- 워크플로우: `AIBrain/01-Base/Best-Practices/Claude-Code-Workflow.md`

## 핵심 프로토콜 (Core-Protocol 축약)

### 언어 정책
- 응답/코드 주석/문서: 한국어
- 커밋 메시지: 영문
- 변수/함수명: 영문

### CONDUCTOR 원칙
- 코드 변경은 executor 에이전트에 위임
- SDK/API 사용 전 공식 문서 먼저 확인 (Context7 MCP 활용)
- Architect 검증 없이 완료 선언 금지

### 검증 프로토콜
1. IDENTIFY → 증명할 명령 결정
2. RUN → 실행
3. READ → 결과 확인
4. CLAIM → 증거와 함께 주장

### TDD 필수
- 테스트 먼저 작성 (RED → GREEN → REFACTOR)
- 새 기능 = 새 테스트, 버그 수정 = 회귀 테스트

### 커밋 전 검증
1. pnpm lint → 에러 0개
2. pnpm typecheck → 에러 0개
3. pnpm test → 모든 통과
4. pnpm test:coverage → 80% 이상

### 커밋 규칙
- Atomic commit (논리 단위별 분리)
- 의존 방향: 타입 → 백엔드 → 프론트엔드
- 리팩토링 + 기능 추가 혼합 금지

### 설계 완료 시 요약 필수
설계/계획 완료 시 응답 끝에 설계 요약 테이블 포함

### 세션 종료 시 요약 필수
Completed/Remaining/Verification Status/Known Issues 형식

## 엔지니어링 철학 (Engineering-Philosophy 축약)

### 코드 우선순위
1. 정확성 → 2. 명확성 → 3. 테스트 가능성 → 4. 성능 → 5. 간결성

### 핵심 원칙
- DRY: 3회+ 반복 시 즉시 추상화 (단, 잘못된 추상화보다는 약간의 중복)
- 충분한 엔지니어링: Over도 Under도 아닌 적정 수준
- 엣지 케이스 우선: 적은 것보다 많은 처리 선호
- 명시적 > 영리함: 읽기 쉬운 코드 우선
- 성능 최적화: 측정 후 진행 (추측 기반 금지)

## Context 관리
- CLAUDE.md: 150줄 이하, 핵심만
- 서브태스크: context 50% 이내 완료 가능하게 분할
- 탐색: 10개 파일 후 반드시 중간 요약
- 배치: 5개마다 진행 상황 보고

## 패키지 구조
```
packages/
├── shared/      — 공유 타입 (pipeline, task, epic 등)
├── backend/     — Fastify API + SQLite + 실행 엔진
├── dashboard/   — Next.js 대시보드 + React Flow
├── mcp-server/  — MCP 도구 서버
└── cli/         — CLI 도구
```
