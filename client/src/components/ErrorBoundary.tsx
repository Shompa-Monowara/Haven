import { Component, type ErrorInfo, type ReactNode } from "react";

import { ServerErrorPage } from "@/pages/ServerErrorPage";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time errors in the routed tree and shows the 500 page with a
 * retry action and a support reference instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage onRetry={this.reset} />;
    }

    return this.props.children;
  }
}