export type ContentMode = 'success' | 'empty' | 'error' | 'slow';
export type VideoMode = 'normal' | 'buffering' | 'error' | 'completeQuickly';

export interface LaunchArgs {
  resetAllState?: boolean;
  resetConsent?: boolean;
  contentMode?: ContentMode;
  videoMode?: VideoMode;
  contentDelayMs?: number;
  videoBufferingMs?: number;
}

export function buildLaunchArgs(args: LaunchArgs): string[] {
  const extras: string[] = [];

  if (args.resetAllState !== undefined) {
    extras.push('--ez', 'resetAllState', String(args.resetAllState));
  }
  if (args.resetConsent !== undefined) {
    extras.push('--ez', 'resetConsent', String(args.resetConsent));
  }
  if (args.contentMode !== undefined) {
    extras.push('--es', 'contentMode', args.contentMode);
  }
  if (args.videoMode !== undefined) {
    extras.push('--es', 'videoMode', args.videoMode);
  }
  if (args.contentDelayMs !== undefined) {
    extras.push('--ei', 'contentDelayMs', String(args.contentDelayMs));
  }
  if (args.videoBufferingMs !== undefined) {
    extras.push('--ei', 'videoBufferingMs', String(args.videoBufferingMs));
  }

  return extras;
}
