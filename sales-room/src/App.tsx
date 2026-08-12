import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { CaseView } from "./components/CaseView";
import { FilesView } from "./components/FilesView";
import { VideosView } from "./components/VideosView";
import { ManageView } from "./components/manage/ManageView";
import { RoomsProvider, useRooms } from "./context/RoomsContext";
import { AssetsProvider } from "./context/AssetsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SharedRoom } from "./components/SharedRoom";
import { SignIn } from "./components/SignIn";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { Audience, RoomView } from "./types";

/** Share links are /r/<token>. Read once: these pages never client-navigate. */
function shareToken(): string | null {
  const m = window.location.pathname.match(/^\/r\/([A-Za-z0-9_-]{16,})\/?$/);
  return m ? m[1] : null;
}

function Room() {
  const [audience, setAudience] = useState<Audience>("rep");
  const [view, setView] = useState<RoomView>("case");
  const { activeRoom } = useRooms();

  // A rep works several deals at once, and browser tabs are how they tell one
  // window from another. Naming the counterparty is the only thing that makes
  // four identical tabs distinguishable.
  useEffect(() => {
    document.title = `${activeRoom.account.company} · 1Fort AI`;
  }, [activeRoom.account.company]);

  // The CMS is rep-only; flipping to the counterparty view leaves it.
  const effectiveView: RoomView = audience === "buyer" && view === "manage" ? "case" : view;

  // Manage takes over the window. It carries its own rooms rail and exit
  // control, so keeping the room sidebar would name the same room twice.
  if (effectiveView === "manage") {
    return <ManageView onExit={() => setView("case")} />;
  }

  return (
    <div className="grid min-h-screen min-w-[1440px] grid-cols-[268px_1fr] bg-white">
      <Sidebar
        audience={audience}
        setAudience={setAudience}
        view={effectiveView}
        setView={setView}
        curatedCount={activeRoom.curatedVideoIds.length}
      />
      <main className="min-w-0 bg-panel">
        {effectiveView === "case" && <CaseView audience={audience} />}
        {effectiveView === "files" && <FilesView audience={audience} />}
        {effectiveView === "videos" && <VideosView audience={audience} />}
      </main>
    </div>
  );
}

/** The rep side: gated when there's a backend, open when running locally. */
function RepApp() {
  const { cloud, session, loading } = useAuth();

  if (cloud && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nav">
        <span className="font-mono text-[11px] tracking-[0.1em] text-nav-faint uppercase">
          Loading
        </span>
      </div>
    );
  }
  if (cloud && !session) return <SignIn />;

  return (
    <AssetsProvider>
      <RoomsProvider>
        <Room />
      </RoomsProvider>
    </AssetsProvider>
  );
}

export default function App() {
  // A prospect's link is public and must not sit behind the sign-in gate, so
  // it is resolved before auth is even considered.
  const token = shareToken();

  return (
    <ErrorBoundary>
      <AuthProvider>{token ? <SharedRoom token={token} /> : <RepApp />}</AuthProvider>
    </ErrorBoundary>
  );
}
