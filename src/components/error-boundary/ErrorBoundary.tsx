import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.8)'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>Oops! Something went wrong</h2>
                    <p style={{ marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        We're sorry for the inconvenience. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(138, 43, 226, 0.8)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
