import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#121417] text-[#F1F3F5] p-6">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-[#1A1D22] p-6 space-y-4">
            <h2 className="text-lg font-semibold">Application Recovery</h2>
            <p className="text-sm text-neutral-400 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Restore Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
