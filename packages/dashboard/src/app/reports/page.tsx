'use client';

import { useState } from 'react';
import { useReports, useGenerateStandup } from '@/lib/hooks/use-reports';
import { ReportViewer } from '@/components/reports/report-viewer';
import { Plus, FileText } from 'lucide-react';
import { formatDate } from '@claudeops/shared';

export default function ReportsPage() {
  const { data } = useReports();
  const generateStandup = useGenerateStandup();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const selectedReport = data?.items.find((r) => r.id === selectedReportId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리포트</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">총 {data.total}개</p>}
        </div>
        <button onClick={() => generateStandup.mutate()}
          disabled={generateStandup.isPending}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
          <Plus className="h-4 w-4" /> {generateStandup.isPending ? '생성 중...' : '스탠드업 생성'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">리포트 목록</h2>
            {!data ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">리포트가 없습니다.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {data.items.map((report) => (
                  <button key={report.id} onClick={() => setSelectedReportId(report.id)}
                    className={`w-full cursor-pointer text-left rounded-md border p-3 transition-colors ${
                      selectedReportId === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.report_type}</p>
                        {report.session_id && (
                          <p className="text-xs text-muted-foreground truncate">
                            세션: {report.session_id.slice(0, 8)}...
                          </p>
                        )}
                        {report.created_at && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedReport ? (
            <ReportViewer report={selectedReport} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">리포트를 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
