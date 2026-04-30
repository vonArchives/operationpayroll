import React, { Component } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
              <AlertCircle className="h-6 w-6 text-danger" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
            <p className="mt-2 text-sm text-text-muted">Please refresh the page to continue.</p>
            <Button
              className="mt-6 w-full"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
