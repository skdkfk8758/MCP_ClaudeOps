'use client';

import { useState } from 'react';
import { useAddMember } from '@/lib/hooks/use-teams';
import { X } from 'lucide-react';

export function MemberCreateDialog({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: number }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState('');
  const addMember = useAddMember();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const specs = specialties.split(',').map(s => s.trim()).filter(Boolean);
    addMember.mutate({
      team_id: teamId, name: name.trim(), role,
      email: email.trim() || undefined,
      specialties: specs.length > 0 ? specs : undefined,
    }, {
      onSuccess: () => { setName(''); setRole('member'); setEmail(''); setSpecialties(''); onClose(); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">멤버 추가</h2>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-name" className="text-sm text-muted-foreground block mb-1">이름 *</label>
            <input id="member-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="홍길동" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="member-role" className="text-sm text-muted-foreground block mb-1">역할</label>
              <select id="member-role" value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="lead">리드</option>
                <option value="member">멤버</option>
                <option value="observer">옵저버</option>
              </select>
            </div>
            <div>
              <label htmlFor="member-email" className="text-sm text-muted-foreground block mb-1">이메일</label>
              <input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="email@example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="member-specs" className="text-sm text-muted-foreground block mb-1">전문 분야 (쉼표 구분)</label>
            <input id="member-specs" type="text" value={specialties} onChange={(e) => setSpecialties(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="frontend, backend, devops" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors">취소</button>
            <button type="submit" disabled={addMember.isPending}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              {addMember.isPending ? '추가 중...' : '멤버 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
