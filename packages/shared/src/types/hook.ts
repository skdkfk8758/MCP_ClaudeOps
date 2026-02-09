export type HookEventType =
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'UserPromptSubmit'
  | 'Stop';

export interface HookInput {
  hook_type: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface HookOutput {
  continue: boolean;
}
