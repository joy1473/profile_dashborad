"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

export type FallbackRender = (error: Error, reset: () => void) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Static fallback UI or render function with error + reset */
  fallback?: ReactNode | FallbackRender;
  /** Called when an error is caught (for logging) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;

      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-400">
          문제가 발생했습니다. 페이지를 새로고침해주세요.
        </div>
      );
    }

    return this.props.children;
  }
}
