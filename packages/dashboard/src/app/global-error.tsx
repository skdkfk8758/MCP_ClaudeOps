'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <button
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
