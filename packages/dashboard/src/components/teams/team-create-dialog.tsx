'use client';

import { useState } from 'react';
import { useCreateTeam } from '@/lib/hooks/use-teams';
import { X } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

export function TeamCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const createTeam = useCreateTeam();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTeam.mutate({ name: name.trim(), description: description.trim() || undefined, avatar_color: color }, {
      onSuccess: () => { setName(''); setDescription(''); setColor('#6366f1'); onClose(); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">새 팀 만들기</h2>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="team-name" className="text-sm text-muted-foreground block mb-1">팀 이름 *</label>
            <input id="team-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="개발팀" />
          </div>
          <div>
            <label htmlFor="team-desc" className="text-sm text-muted-foreground block mb-1">설명</label>
            <input id="team-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="팀 설명..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-2">팀 색상</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`cursor-pointer w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors">취소</button>
            <button type="submit" disabled={createTeam.isPending}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              {createTeam.isPending ? '생성 중...' : '팀 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
