'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[200px] items-center justify-center p-8 text-center">
          <div>
            <p className="text-sm font-semibold text-[var(--burgundy)]">Something went wrong</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 text-xs text-[var(--gold)] underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
