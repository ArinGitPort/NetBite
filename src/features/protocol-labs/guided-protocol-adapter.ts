export interface StoredProtocolSession {
  engineVersion: number;
  state: unknown;
  updatedAt: string;
}

export interface GuidedProtocolAdapter<TState, TAction, TResult> {
  id: string;
  engineVersion: number;
  createInitialState: () => TState;
  validateState: (value: unknown) => value is TState;
  applyAction: (state: TState, action: TAction) => TResult;
}

export function restoreProtocolState<TState, TAction, TResult>(
  adapter: GuidedProtocolAdapter<TState, TAction, TResult>,
  session?: StoredProtocolSession,
) {
  if (!session) return { state: adapter.createInitialState(), recovered: false };
  if (session.engineVersion === adapter.engineVersion && adapter.validateState(session.state)) {
    return { state: session.state, recovered: false };
  }
  return { state: adapter.createInitialState(), recovered: true };
}
