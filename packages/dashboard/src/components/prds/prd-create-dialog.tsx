'use client';

import { useState } from 'react';
import { useCreatePrd } from '@/lib/hooks/use-prds';
import { X } from 'lucide-react';

export function PrdCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vision, setVision] = useState('');
  const createPrd = useCreatePrd();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createPrd.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      vision: vision.trim() || undefined,
    }, {
      onSuccess: () => {
        setTitle(''); setDescription(''); setVision('');
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">새 PRD 만들기</h2>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prd-title" className="text-sm text-muted-foreground block mb-1">제목 *</label>
            <input id="prd-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="PRD 제목 입력..." />
          </div>
          <div>
            <label htmlFor="prd-vision" className="text-sm text-muted-foreground block mb-1">비전</label>
            <textarea id="prd-vision" value={vision} onChange={(e) => setVision(e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="프로젝트 비전..." />
          </div>
          <div>
            <label htmlFor="prd-desc" className="text-sm text-muted-foreground block mb-1">설명</label>
            <textarea id="prd-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="PRD 설명..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors">취소</button>
            <button type="submit" disabled={createPrd.isPending}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              {createPrd.isPending ? '생성 중...' : 'PRD 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
