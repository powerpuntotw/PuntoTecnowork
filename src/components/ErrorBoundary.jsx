import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Global Error Boundary – catches any render-phase errors in the React tree
 * (e.g. format(new Date(undefined)) throwing from date-fns).
 * Without this, React silently blanks the entire UI on any render throw.
 */
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught a render error:', error, info);
    }

    handleReset() {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-orange-400" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Algo salió mal</h2>
                    <p className="text-gray-500 text-sm max-w-sm">
                        Hubo un error inesperado al mostrar esta sección. Podés intentar recargar o volver al inicio.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => this.handleReset()}
                            className="px-5 py-2 bg-primary text-white rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition"
                        >
                            <RefreshCw className="w-4 h-4" /> Reintentar
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Recargar página
                        </button>
                    </div>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg text-left max-w-full overflow-auto max-h-40">
                            {this.state.error.message}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
