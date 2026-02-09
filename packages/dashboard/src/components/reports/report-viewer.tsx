'use client';

import type { SessionReport } from '@claudeops/shared';

export function ReportViewer({ report }: { report: SessionReport }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">{report.report_type}</h2>
        {report.session_id && (
          <p className="text-xs text-muted-foreground">세션: {report.session_id.slice(0, 8)}...</p>
        )}
        {report.created_at && (
          <p className="text-xs text-muted-foreground">생성: {report.created_at.slice(0, 19).replace('T', ' ')}</p>
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-x-auto">{report.content}</pre>
      </div>
    </div>
  );
}
