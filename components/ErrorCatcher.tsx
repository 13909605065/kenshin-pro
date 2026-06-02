"use client";

import { Component } from "react";

interface State {
  error: Error | null;
}

export class ErrorCatcher extends Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <html lang="zh-CN">
          <body className="min-h-screen bg-pitch-900 flex items-center justify-center p-8">
            <div className="glass-card p-6 max-w-2xl w-full">
              <p className="text-neon-red font-bold text-lg mb-3">
                ⚠️ 客户端渲染错误
              </p>
              <p className="text-white font-mono text-sm mb-2">
                {this.state.error.message}
              </p>
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  查看完整堆栈
                </summary>
                <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap overflow-auto max-h-96">
                  {this.state.error.stack}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-neon-pink text-white rounded-lg text-sm"
              >
                刷新页面
              </button>
            </div>
          </body>
        </html>
      );
    }
    return this.props.children;
  }
}
