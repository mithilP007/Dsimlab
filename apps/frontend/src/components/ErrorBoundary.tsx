import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"
import { AlertOctagon, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled platform crash:", error, errorInfo)
    this.setState({ errorInfo })

    // Post frontend error report
    api.post("/api/v1/error-reports", {
      errorMessage: error.message || error.toString(),
      errorStack: error.stack || errorInfo.componentStack || "",
      path: window.location.pathname,
      userAgent: navigator.userAgent
    }).catch(err => {
      console.warn("Failed to report telemetry crash to backend:", err);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = "/"
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg w-full shadow-lg space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-bounce">
                <AlertOctagon className="h-9 w-9" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-neutral-900">Console View Crashed</h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                An unexpected exception was encountered while executing React layout triggers.
                This usually occurs due to missing simulation state descriptors.
              </p>
            </div>

            {/* Error Message Collapse */}
            {this.state.error && (
              <div className="bg-neutral-950 text-left p-3 rounded-lg border border-neutral-800 text-[11px] font-mono text-red-400 overflow-x-auto max-h-32 select-all">
                <span className="font-bold text-white block mb-0.5">Error Message:</span>
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="rounded-lg font-semibold border-neutral-200 inline-flex items-center gap-1.5"
              >
                <Home className="h-4 w-4" />
                <span>Return Home</span>
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload View</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
