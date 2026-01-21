"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              Something went wrong
            </h1>
            <div className="bg-white dark:bg-gray-900 rounded p-4 overflow-auto">
              <p className="font-mono text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {this.state.error?.message || "Unknown error"}
              </p>
              {this.state.error?.stack && (
                <pre className="mt-4 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-64">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
