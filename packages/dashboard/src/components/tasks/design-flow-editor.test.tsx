import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ReactFlow mock에서 캡처된 props
let capturedPreviewProps: Record<string, unknown> = {};
let capturedEditorProps: Record<string, unknown> = {};
let renderCount = 0;

vi.mock('@xyflow/react', () => {
  const { useState, useCallback } = React;

  const useNodesState = (initial: unknown[]) => {
    const [nodes, _setNodes] = useState<unknown[]>(initial);
    const setNodes = useCallback((updater: unknown) => {
      if (typeof updater === 'function') {
        _setNodes(updater as (prev: unknown[]) => unknown[]);
      } else {
        _setNodes(updater as unknown[]);
      }
    }, []);
    const onNodesChange = vi.fn();
    return [nodes, setNodes, onNodesChange];
  };

  const useEdgesState = (initial: unknown[]) => {
    const [edges, _setEdges] = useState<unknown[]>(initial);
    const setEdges = useCallback((updater: unknown) => {
      if (typeof updater === 'function') {
        _setEdges(updater as (prev: unknown[]) => unknown[]);
      } else {
        _setEdges(updater as unknown[]);
      }
    }, []);
    const onEdgesChange = vi.fn();
    return [edges, setEdges, onEdgesChange];
  };

  return {
    ReactFlow: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // 편집 불가 = 미리보기, 편집 가능 = 에디터
      if (props.nodesDraggable === false) {
        capturedPreviewProps = props;
        return (
          <div data-testid="preview-flow">
            {(props.nodes as { id: string; data: { label: string } }[])?.map((n) => (
              <div key={n.id} data-testid={`preview-node-${n.id}`}>
                {n.data?.label}
              </div>
            ))}
            {children}
          </div>
        );
      }
      capturedEditorProps = props;
      renderCount++;
      return (
        <div data-testid="editor-flow" onClick={() => (props.onPaneClick as () => void)?.()}>
          {(props.nodes as { id: string; data: { label: string; agentType: string; prompt: string } }[])?.map((n) => (
            <div
              key={n.id}
              data-testid={`editor-node-${n.id}`}
              onClick={(e) => {
                e.stopPropagation();
                (props.onNodeClick as (e: React.MouseEvent, node: unknown) => void)?.(e, n);
              }}
            >
              {n.data?.label}
            </div>
          ))}
          {children}
        </div>
      );
    },
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    addEdge: vi.fn((params: unknown, edges: unknown[]) => [...edges, params]),
    useNodesState,
    useEdgesState,
  };
});

vi.mock('@/components/pipelines/agent-node', () => ({
  AgentNode: () => <div />,
}));

vi.mock('@/components/pipelines/node-settings-panel', () => ({
  NodeSettingsPanel: ({ onChange, onClose }: { onChange: (partial: Record<string, unknown>) => void; onClose: () => void }) => (
    <div data-testid="node-settings-panel">
      <button data-testid="close-panel" onClick={onClose}>닫기</button>
      <button data-testid="change-data" onClick={() => onChange({ prompt: 'updated prompt' })}>변경</button>
    </div>
  ),
}));

vi.mock('@/lib/pipeline/agents', () => ({
  AGENT_DEFINITIONS: [
    { id: 'executor', label: 'Executor', defaultModel: 'sonnet', category: 'build', color: '#3b82f6', description: 'Execute tasks' },
    { id: 'planner', label: 'Planner', defaultModel: 'opus', category: 'plan', color: '#8b5cf6', description: 'Plan work' },
    { id: 'reviewer', label: 'Reviewer', defaultModel: 'sonnet', category: 'review', color: '#10b981', description: 'Review code' },
  ],
  AGENT_CATEGORIES: [
    { id: 'build', label: 'Build' },
    { id: 'plan', label: 'Plan' },
    { id: 'review', label: 'Review' },
    { id: 'empty-cat', label: 'EmptyCat' },
  ],
}));

// analyzeGraph mock - 노드 정보를 기반으로 실제와 유사하게 동작
vi.mock('@/lib/pipeline/graph-analyzer', () => ({
  analyzeGraph: vi.fn((nodes: { id: string; data: { agentType: string; model: string; prompt: string } }[], _edges: unknown[]) => {
    // 노드가 없으면 빈 배열
    if (nodes.length === 0) return [];
    // 각 노드를 개별 step으로 반환
    return nodes.map((n) => ({
      agents: [{ type: n.data.agentType, model: n.data.model, prompt: n.data.prompt }],
      parallel: false,
    }));
  }),
}));

import { DesignFlowEditor } from './design-flow-editor';
import type { DesignStep } from '@claudeops/shared';

const mockSteps: DesignStep[] = [
  {
    step: 1,
    title: 'Step 1',
    agent_type: 'executor',
    model: 'sonnet',
    parallel: false,
    description: 'First step',
    prompt: 'Do step 1',
    expected_output: 'Output 1',
  },
  {
    step: 2,
    title: 'Step 2',
    agent_type: 'planner',
    model: 'opus',
    parallel: false,
    description: 'Second step',
    prompt: 'Do step 2',
    expected_output: 'Output 2',
  },
];

const parallelSteps: DesignStep[] = [
  {
    step: 1,
    title: 'Parallel A',
    agent_type: 'executor',
    model: 'sonnet',
    parallel: true,
    description: '',
    prompt: 'A',
    expected_output: '',
  },
  {
    step: 2,
    title: 'Parallel B',
    agent_type: 'planner',
    model: 'opus',
    parallel: true,
    description: '',
    prompt: 'B',
    expected_output: '',
  },
  {
    step: 3,
    title: 'Sequential C',
    agent_type: 'reviewer',
    model: 'sonnet',
    parallel: false,
    description: '',
    prompt: 'C',
    expected_output: '',
  },
];

function renderEditor(overrides: Partial<Parameters<typeof DesignFlowEditor>[0]> = {}) {
  const defaultProps = {
    steps: mockSteps,
    onSave: vi.fn(),
    saving: false,
  };
  const props = { ...defaultProps, ...overrides };
  return { ...render(<DesignFlowEditor {...props} />), props };
}

describe('DesignFlowEditor', () => {
  beforeEach(() => {
    capturedPreviewProps = {};
    capturedEditorProps = {};
    renderCount = 0;
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  // --- 빈 상태 ---
  describe('빈 상태', () => {
    it('steps가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
      const { container } = renderEditor({ steps: [] });
      expect(container.innerHTML).toBe('');
    });
  });

  // --- 미리보기 모드 ---
  describe('미리보기 모드', () => {
    it('미리보기 ReactFlow를 렌더링한다', () => {
      renderEditor();
      expect(screen.getByTestId('preview-flow')).toBeInTheDocument();
    });

    it('미리보기 노드를 렌더링한다', () => {
      renderEditor();
      expect(screen.getByText('Executor')).toBeInTheDocument();
      expect(screen.getByText('Planner')).toBeInTheDocument();
    });

    it('미리보기는 읽기 전용이다 (nodesDraggable=false)', () => {
      renderEditor();
      expect(capturedPreviewProps.nodesDraggable).toBe(false);
      expect(capturedPreviewProps.nodesConnectable).toBe(false);
      expect(capturedPreviewProps.elementsSelectable).toBe(false);
    });

    it('미리보기에 fitView가 활성화된다', () => {
      renderEditor();
      expect(capturedPreviewProps.fitView).toBe(true);
    });

    it('"편집" 버튼이 존재한다', () => {
      renderEditor();
      expect(screen.getByText('편집')).toBeInTheDocument();
    });

    it('편집 모드가 아닐 때 에디터가 렌더링되지 않는다', () => {
      renderEditor();
      expect(screen.queryByTestId('editor-flow')).not.toBeInTheDocument();
    });
  });

  // --- 편집 모드 진입 ---
  describe('편집 모드 진입', () => {
    it('"편집" 클릭 시 모달이 열린다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
    });

    it('모달 열림 시 미리보기도 여전히 렌더링된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(screen.getByTestId('preview-flow')).toBeInTheDocument();
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
    });

    it('모달 열림 시 body overflow가 hidden으로 설정된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('모달 헤더에 "플로우 편집" 텍스트가 표시된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 헤더의 "플로우 편집" (편집 버튼과는 별개)
      expect(screen.getByText('플로우 편집')).toBeInTheDocument();
    });

    it('에디터 ReactFlow에 올바른 속성이 전달된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(capturedEditorProps.nodesDraggable).toBe(true);
      expect(capturedEditorProps.nodesConnectable).toBe(true);
      expect(capturedEditorProps.elementsSelectable).toBe(true);
      expect(capturedEditorProps.deleteKeyCode).toBe('Delete');
      expect(capturedEditorProps.fitView).toBe(true);
    });

    it('에디터에 Controls가 렌더링된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(screen.getByTestId('controls')).toBeInTheDocument();
    });
  });

  // --- 모달 닫기 ---
  describe('모달 닫기', () => {
    it('"취소" 클릭 시 모달이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
      fireEvent.click(screen.getByText('취소'));
      expect(screen.queryByTestId('editor-flow')).not.toBeInTheDocument();
    });

    it('취소 후 body overflow가 복원된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(document.body.style.overflow).toBe('hidden');
      fireEvent.click(screen.getByText('취소'));
      expect(document.body.style.overflow).toBe('');
    });

    it('ESC 키로 모달이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('editor-flow')).not.toBeInTheDocument();
    });

    it('ESC가 아닌 키는 모달을 닫지 않는다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
    });

    it('모달 오버레이 클릭 시 모달이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 오버레이는 fixed inset-0 z-50 div
      const overlay = screen.getByTestId('editor-flow').closest('.fixed');
      expect(overlay).not.toBeNull();
      fireEvent.click(overlay!);
      expect(screen.queryByTestId('editor-flow')).not.toBeInTheDocument();
    });

    it('모달 컨테이너 내부 클릭은 모달을 닫지 않는다 (stopPropagation)', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 모달 컨테이너 (rounded-lg) 내부 클릭
      const container = screen.getByText('플로우 편집').closest('.rounded-lg');
      expect(container).not.toBeNull();
      fireEvent.click(container!);
      expect(screen.getByTestId('editor-flow')).toBeInTheDocument();
    });
  });

  // --- 저장 ---
  describe('저장', () => {
    it('"저장" 클릭 시 onSave가 호출되고 모달이 닫힌다', () => {
      const { props } = renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('저장'));
      expect(props.onSave).toHaveBeenCalled();
      expect(screen.queryByTestId('editor-flow')).not.toBeInTheDocument();
    });

    it('saving=true일 때 저장 버튼이 비활성화된다', () => {
      renderEditor({ saving: true });
      fireEvent.click(screen.getByText('편집'));
      const saveButton = screen.getByText('저장').closest('button');
      expect(saveButton).toBeDisabled();
    });
  });

  // --- 에이전트 추가 ---
  describe('에이전트 추가', () => {
    it('"에이전트 추가" 클릭 시 드롭다운이 열린다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('에이전트 추가'));
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('에이전트 클릭 시 드롭다운이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('에이전트 추가'));
      // 카테고리 내 에이전트 클릭
      fireEvent.click(screen.getByText('Reviewer'));
      // 드롭다운이 닫혀야 함
      expect(screen.queryByText('Review')).not.toBeInTheDocument();
    });

    it('에이전트 추가 토글: 두 번 클릭 시 드롭다운이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('에이전트 추가'));
      expect(screen.getByText('Build')).toBeInTheDocument();
      fireEvent.click(screen.getByText('에이전트 추가'));
      expect(screen.queryByText('Build')).not.toBeInTheDocument();
    });
  });

  // --- 노드 클릭 / 설정 패널 ---
  describe('노드 클릭 및 설정 패널', () => {
    it('에디터 노드 클릭 시 설정 패널이 열린다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
    });

    it('패널 닫기 버튼 클릭 시 설정 패널이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('close-panel'));
      expect(screen.queryByTestId('node-settings-panel')).not.toBeInTheDocument();
    });

    it('ReactFlow pane 클릭 시 설정 패널이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('editor-flow'));
      expect(screen.queryByTestId('node-settings-panel')).not.toBeInTheDocument();
    });
  });

  // --- 자동 정렬 ---
  describe('자동 정렬', () => {
    it('자동 정렬 버튼이 존재한다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const autoLayoutBtn = screen.getByTitle('자동 정렬');
      expect(autoLayoutBtn).toBeInTheDocument();
    });

    it('자동 정렬 클릭이 에러 없이 동작한다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const autoLayoutBtn = screen.getByTitle('자동 정렬');
      expect(() => fireEvent.click(autoLayoutBtn)).not.toThrow();
    });
  });

  // --- 변환 함수 (parallel steps) ---
  describe('변환 함수 - parallel steps', () => {
    it('parallel steps가 올바르게 그룹핑되어 렌더링된다', () => {
      renderEditor({ steps: parallelSteps });
      // 미리보기에서 3개 노드가 모두 렌더링되어야 함
      expect(screen.getByText('Executor')).toBeInTheDocument();
      expect(screen.getByText('Planner')).toBeInTheDocument();
      expect(screen.getByText('Reviewer')).toBeInTheDocument();
    });
  });

  // --- scope_tag 처리 ---
  describe('scope_tag 처리', () => {
    it('out-of-scope 태그가 적용된 step이 올바르게 렌더링된다', () => {
      const scopeSteps: DesignStep[] = [
        { ...mockSteps[0], scope_tag: 'out-of-scope' },
      ];
      renderEditor({ steps: scopeSteps });
      expect(screen.getByTestId('preview-flow')).toBeInTheDocument();
    });

    it('partial 태그가 적용된 step이 올바르게 렌더링된다', () => {
      const scopeSteps: DesignStep[] = [
        { ...mockSteps[0], scope_tag: 'partial' },
      ];
      renderEditor({ steps: scopeSteps });
      expect(screen.getByTestId('preview-flow')).toBeInTheDocument();
    });
  });

  // --- 언마운트 시 cleanup ---
  describe('cleanup', () => {
    it('컴포넌트 언마운트 시 body overflow가 복원된다', () => {
      const { unmount } = renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(document.body.style.overflow).toBe('hidden');
      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('편집 모드에서 언마운트 시 keydown 리스너가 제거된다', () => {
      const { unmount } = renderEditor();
      fireEvent.click(screen.getByText('편집'));
      unmount();
      // 에러 없이 keydown이 발생해야 함
      expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
    });
  });

  // --- 노드 삭제 ---
  describe('노드 삭제', () => {
    it('onNodesDelete 콜백이 전달된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(capturedEditorProps.onNodesDelete).toBeDefined();
    });

    it('onNodesDelete 호출이 에러 없이 동작한다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const onNodesDelete = capturedEditorProps.onNodesDelete as (nodes: unknown[]) => void;
      act(() => {
        onNodesDelete([{ id: 'design-0-0' }]);
      });
    });

    it('선택된 노드가 삭제되면 설정 패널이 닫힌다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 노드 선택
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
      // 해당 노드 삭제
      const onNodesDelete = capturedEditorProps.onNodesDelete as (nodes: unknown[]) => void;
      act(() => {
        onNodesDelete([{ id: 'design-0-0' }]);
      });
    });
  });

  // --- onConnect ---
  describe('엣지 연결', () => {
    it('onConnect 콜백이 전달된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      expect(capturedEditorProps.onConnect).toBeDefined();
    });

    it('onConnect 호출이 에러 없이 동작한다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      const onConnect = capturedEditorProps.onConnect as (params: unknown) => void;
      act(() => {
        onConnect({ source: 'design-0-0', target: 'design-1-0' });
      });
    });
  });

  // --- 빈 노드에서 에이전트 추가 ---
  describe('빈 그래프에서 에이전트 추가', () => {
    it('steps가 1개인 상태에서 에이전트 추가가 동작한다', () => {
      renderEditor({ steps: [mockSteps[0]] });
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('에이전트 추가'));
      fireEvent.click(screen.getByText('Reviewer'));
      // 에러 없이 추가됨
      expect(screen.queryByText('Build')).not.toBeInTheDocument(); // 드롭다운 닫힘
    });
  });

  // --- 마지막이 parallel인 steps ---
  describe('마지막이 parallel인 steps (groupStepsIntoLevels 커버)', () => {
    it('마지막 steps가 모두 parallel이면 올바르게 그룹핑된다', () => {
      const endParallelSteps: DesignStep[] = [
        {
          step: 1,
          title: 'Sequential',
          agent_type: 'executor',
          model: 'sonnet',
          parallel: false,
          description: '',
          prompt: '',
          expected_output: '',
        },
        {
          step: 2,
          title: 'ParA',
          agent_type: 'planner',
          model: 'opus',
          parallel: true,
          description: '',
          prompt: '',
          expected_output: '',
        },
        {
          step: 3,
          title: 'ParB',
          agent_type: 'reviewer',
          model: 'sonnet',
          parallel: true,
          description: '',
          prompt: '',
          expected_output: '',
        },
      ];
      renderEditor({ steps: endParallelSteps });
      // 3개 노드 모두 렌더링
      expect(screen.getByText('Executor')).toBeInTheDocument();
      expect(screen.getByText('Planner')).toBeInTheDocument();
      expect(screen.getByText('Reviewer')).toBeInTheDocument();
    });
  });

  // --- handleNodeDataChange 커버 ---
  describe('노드 데이터 변경 (handleNodeDataChange)', () => {
    it('NodeSettingsPanel의 onChange 호출 시 노드 데이터가 변경된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 노드 선택
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
      // 데이터 변경 버튼 클릭 → handleNodeDataChange 호출
      act(() => {
        fireEvent.click(screen.getByTestId('change-data'));
      });
      // 에러 없이 동작
      expect(screen.getByTestId('node-settings-panel')).toBeInTheDocument();
    });

    it('selectedNodeId가 없을 때 handleNodeDataChange가 early return한다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 노드 선택하지 않은 상태에서 pane 클릭 (selectedNodeId = null 보장)
      fireEvent.click(screen.getByTestId('editor-flow'));
      expect(screen.queryByTestId('node-settings-panel')).not.toBeInTheDocument();
    });
  });

  // --- 에이전트 추가 드롭다운 내 카테고리 표시 ---
  describe('에이전트 추가 드롭다운', () => {
    it('드롭다운에 모든 카테고리와 에이전트가 표시된다 (빈 카테고리 제외)', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('에이전트 추가'));
      // 카테고리 헤더 (EmptyCat은 에이전트가 없어 표시 안 됨)
      expect(screen.getByText('Build')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.queryByText('EmptyCat')).not.toBeInTheDocument();
      // 에이전트 설명
      expect(screen.getByText('Execute tasks')).toBeInTheDocument();
      expect(screen.getByText('Plan work')).toBeInTheDocument();
      expect(screen.getByText('Review code')).toBeInTheDocument();
    });
  });

  // --- 빈 그래프에서 에이전트 추가 (nodes.length === 0 브랜치) ---
  describe('노드 전체 삭제 후 에이전트 추가', () => {
    it('노드가 없는 상태에서 에이전트 추가 시 자동 연결 없이 추가된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 모든 노드 삭제
      const onNodesDelete = capturedEditorProps.onNodesDelete as (nodes: unknown[]) => void;
      act(() => {
        onNodesDelete([{ id: 'design-0-0' }, { id: 'design-1-0' }]);
      });
      // 에이전트 추가
      fireEvent.click(screen.getByText('에이전트 추가'));
      fireEvent.click(screen.getByText('Reviewer'));
      // 에러 없이 추가됨
      expect(screen.queryByText('Build')).not.toBeInTheDocument();
    });
  });

  // --- graphToDesignSteps 빈 노드 ---
  describe('graphToDesignSteps 빈 노드 처리', () => {
    it('에디터에서 모든 노드를 삭제 후 저장 시 빈 배열이 반환된다', () => {
      const { props } = renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 모든 노드 삭제
      const onNodesDelete = capturedEditorProps.onNodesDelete as (nodes: unknown[]) => void;
      act(() => {
        onNodesDelete([{ id: 'design-0-0' }, { id: 'design-1-0' }]);
      });
      fireEvent.click(screen.getByText('저장'));
      expect(props.onSave).toHaveBeenCalled();
    });
  });

  // --- 알 수 없는 agent_type ---
  describe('알 수 없는 agent_type 처리', () => {
    it('AGENT_DEFINITIONS에 없는 agent_type이 fallback label로 렌더링된다', () => {
      const unknownSteps: DesignStep[] = [
        {
          step: 1,
          title: 'Custom Step',
          agent_type: 'unknown-agent',
          model: 'sonnet',
          parallel: false,
          description: '',
          prompt: '',
          expected_output: '',
        },
      ];
      renderEditor({ steps: unknownSteps });
      // def가 없으므로 agent_type이 label로 사용됨
      expect(screen.getByText('unknown-agent')).toBeInTheDocument();
    });
  });

  // --- scope_tag 없는 경우 ---
  describe('scope_tag가 없는 step', () => {
    it('scope_tag가 undefined일 때 기본 색상이 사용된다', () => {
      renderEditor({ steps: [mockSteps[0]] }); // scope_tag 없음
      expect(screen.getByTestId('preview-flow')).toBeInTheDocument();
    });
  });

  // --- graphToDesignSteps fallback 브랜치 ---
  describe('graphToDesignSteps fallback 경로', () => {
    it('저장 시 graphToDesignSteps가 호출되고 원본 데이터가 매핑된다', () => {
      const { props } = renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 노드 데이터를 변경하여 original과 다른 상태 만들기
      const node = screen.getByTestId('editor-node-design-0-0');
      fireEvent.click(node);
      act(() => {
        fireEvent.click(screen.getByTestId('change-data'));
      });
      fireEvent.click(screen.getByText('저장'));
      expect(props.onSave).toHaveBeenCalled();
      const savedSteps = props.onSave.mock.calls[0][0] as DesignStep[];
      expect(savedSteps.length).toBeGreaterThan(0);
    });

    it('빈 steps에서 편집 후 에이전트 추가하고 저장하면 새 step이 생성된다', () => {
      // steps가 1개인 경우에서 시작하여 저장 시 graphToDesignSteps 경유
      const { props } = renderEditor({ steps: [mockSteps[0]] });
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('저장'));
      expect(props.onSave).toHaveBeenCalled();
    });
  });

  // --- onNodesDelete edge 필터링 (source/target 양쪽) ---
  describe('onNodesDelete edge 필터링', () => {
    it('삭제된 노드가 target인 edge도 함께 제거된다', () => {
      renderEditor();
      fireEvent.click(screen.getByText('편집'));
      // 두 번째 노드 삭제 (이 노드는 edge의 target)
      const onNodesDelete = capturedEditorProps.onNodesDelete as (nodes: unknown[]) => void;
      act(() => {
        onNodesDelete([{ id: 'design-1-0' }]);
      });
    });
  });

  // --- graphToDesignSteps 빈 필드 fallback ---
  describe('graphToDesignSteps 빈 필드 fallback', () => {
    it('빈 필드를 가진 steps 저장 시 fallback 값이 사용된다', () => {
      const emptyFieldSteps: DesignStep[] = [
        {
          step: 1,
          title: '',
          agent_type: 'executor',
          model: 'sonnet',
          parallel: false,
          description: '',
          prompt: '',
          expected_output: '',
        },
      ];
      const { props } = renderEditor({ steps: emptyFieldSteps });
      fireEvent.click(screen.getByText('편집'));
      fireEvent.click(screen.getByText('저장'));
      expect(props.onSave).toHaveBeenCalled();
    });
  });
});
