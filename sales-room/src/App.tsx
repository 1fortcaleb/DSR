import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { CaseView } from "./components/CaseView";
import { FilesView } from "./components/FilesView";
import { VideosView } from "./components/VideosView";
import { VIDEOS } from "./data/salesRoom";
import { useDealRoom } from "./hooks/useDealRoom";
import type { Audience, RoomView } from "./types";

function App() {
  const [audience, setAudience] = useState<Audience>("rep");
  const [view, setView] = useState<RoomView>("case");
  const [curatedIds, setCuratedIds] = useState(VIDEOS.map((v) => v.id));
  // Lives here so rep edits survive switching between views.
  const room = useDealRoom("Meridian Risk Partners");

  return (
    <div className="grid min-h-screen min-w-[1440px] grid-cols-[268px_1fr] bg-white">
      <Sidebar
        audience={audience}
        setAudience={setAudience}
        view={view}
        setView={setView}
        curatedCount={curatedIds.length}
      />
      <main className="min-w-0 bg-panel">
        {view === "case" && <CaseView audience={audience} room={room} />}
        {view === "files" && <FilesView audience={audience} />}
        {view === "videos" && (
          <VideosView audience={audience} curatedIds={curatedIds} setCuratedIds={setCuratedIds} />
        )}
      </main>
    </div>
  );
}

export default App;
