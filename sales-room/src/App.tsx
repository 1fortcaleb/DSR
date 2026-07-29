import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { CaseView } from "./components/CaseView";
import { FilesView } from "./components/FilesView";
import { VideosView } from "./components/VideosView";
import { ManageView } from "./components/manage/ManageView";
import { RoomsProvider, useRooms } from "./context/RoomsContext";
import { AssetsProvider } from "./context/AssetsContext";
import type { Audience, RoomView } from "./types";

function Room() {
  const [audience, setAudience] = useState<Audience>("rep");
  const [view, setView] = useState<RoomView>("case");
  const { activeRoom } = useRooms();

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

export default function App() {
  return (
    <AssetsProvider>
      <RoomsProvider>
        <Room />
      </RoomsProvider>
    </AssetsProvider>
  );
}
