'use client';

import { useState } from 'react';
import { useCancelTask } from '@/lib/hooks/use-tasks';
import { useToast } from '@/components/shared/toast';
import { AlertTriangle, X } from 'lucide-react';

export function CancelExecutionDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelTask = useCancelTask();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  if (!open) return null;

  const handleCancel = () => {
    setIsPending(true);
    cancelTask.mutate(taskId, {
      onSuccess: () => {
        toast({ type: 'success', title: '실행 취소됨', description: '태스크 실행이 취소되었습니다.' });
        onOpenChange(false);
        setIsPending(false);
      },
      onError: (err) => {
        toast({ type: 'error', title: '취소 실패', description: err instanceof Error ? err.message : '알 수 없는 오류' });
        setIsPending(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">실행 취소</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          정말 실행을 취소하시겠습니까? 진행 중인 작업이 중단되며, 되돌릴 수 없습니다.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            닫기
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? '취소 중...' : '실행 취소'}
          </button>
        </div>
      </div>
    </div>
  );
}
