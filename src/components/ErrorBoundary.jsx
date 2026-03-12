import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 z-50 bg-black p-10 font-mono text-red-500 overflow-auto">
                    <h1 className="text-2xl mb-4 font-bold">React Runtime Crash</h1>
                    <p className="mb-4 text-white">An unhandled exception caused the React tree to unmount.</p>
                    <pre className="text-xs bg-red-950/30 p-4 border border-red-500/50 rounded whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                        {'\n'}
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
