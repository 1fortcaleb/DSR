import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last line of defence. An uncaught render error otherwise unmounts the tree
 * and leaves a white page, which tells whoever hit it nothing and is painful
 * to diagnose remotely. Show what broke instead.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-nav px-6">
        <div className="flex w-full max-w-[520px] flex-col gap-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
            Something broke
          </span>
          <h1 className="m-0 text-[22px] leading-[1.25] font-bold tracking-[-0.02em] text-white">
            The page couldn't load.
          </h1>
          <pre className="m-0 overflow-x-auto rounded-md border border-nav-line bg-nav-raised p-3 font-mono text-[11.5px] leading-[1.5] whitespace-pre-wrap text-nav-body">
            {error.message}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="cursor-pointer rounded-md border-none bg-periwinkle px-4 py-2 font-sans text-[12.5px] font-bold text-nav"
            >
              Reload
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="cursor-pointer rounded-md border border-nav-line bg-transparent px-4 py-2 font-sans text-[12.5px] font-bold text-nav-body hover:text-white"
            >
              Clear local data and reload
            </button>
          </div>
          <p className="m-0 text-[11.5px] leading-[1.5] text-nav-faint">
            Send this message to whoever maintains the app — it names the actual failure.
          </p>
        </div>
      </div>
    );
  }
}
