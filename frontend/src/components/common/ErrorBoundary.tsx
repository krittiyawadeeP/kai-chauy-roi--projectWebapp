import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาดในการแสดงผล</h2>
            <p className="text-sm text-slate-500 mb-4">
              {this.state.error?.message || 'ระบบพบปัญหาที่ไม่คาดคิด'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-md"
            >
              โหลดหน้าเว็บใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
