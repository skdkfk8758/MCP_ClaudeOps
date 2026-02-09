'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from './websocket';

export function useWebSocketBridge(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    wsClient.connect();

    const unsubSession = wsClient.on('session', () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    const unsubEvent = wsClient.on('event', () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    const unsubAgent = wsClient.on('agent', () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    const unsubStats = wsClient.on('stats', () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    });

    const unsubAlert = wsClient.on('alert', () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
    });

    const unsubTask = wsClient.on('task', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    const unsubPrd = wsClient.on('prd', () => {
      queryClient.invalidateQueries({ queryKey: ['prds'] });
    });

    const unsubEpic = wsClient.on('epic', () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
    });

    const unsubReport = wsClient.on('report', () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    });

    const unsubGitHub = wsClient.on('github', () => {
      queryClient.invalidateQueries({ queryKey: ['github'] });
    });

    const unsubWorktree = wsClient.on('worktree', () => {
      queryClient.invalidateQueries({ queryKey: ['worktrees'] });
    });

    const unsubContext = wsClient.on('context', () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    });

    return () => {
      unsubSession(); unsubEvent(); unsubAgent(); unsubStats(); unsubAlert(); unsubTask();
      unsubPrd(); unsubEpic(); unsubReport(); unsubGitHub(); unsubWorktree(); unsubContext();
      wsClient.disconnect();
    };
  }, [queryClient]);
}
