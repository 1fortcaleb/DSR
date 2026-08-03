import { useState } from "react";
import { useRooms } from "../../context/RoomsContext";
import { providerName } from "../../lib/video";
import { relativeTime } from "../../lib/vocabulary";
import type { RoomKind, RoomMode, RoomStatus, RoomVideo } from "../../types";
import { Button, Grid, ListRow, Section, SelectField, TextField } from "./Field";
import { AssetPicker } from "./AssetPicker";

/* ------------------------------------------------------------------ account */

export function AccountEditor() {
  const { activeRoom, updateRoom, vocabulary } = useRooms();
  const { account } = activeRoom;

  const patchAccount = (patch: Partial<typeof account>) =>
    updateRoom(activeRoom.id, { account: { ...account, ...patch } });

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Room"
        hint="How this room is filed internally. The counterparty never sees the internal name or status. Switching Page changes the question they're asked, not the words on the page."
      >
        <Grid>
          <TextField
            label="Internal name"
            value={activeRoom.name}
            onChange={(v) => updateRoom(activeRoom.id, { name: v })}
          />
          <SelectField<RoomKind>
            label="Type"
            value={activeRoom.kind}
            options={[
              { value: "deal", label: "Deal" },
              { value: "partnership", label: "Partnership" },
            ]}
            onChange={(v) => updateRoom(activeRoom.id, { kind: v })}
          />
          <SelectField<RoomMode>
            label="Page"
            value={activeRoom.mode}
            options={[
              { value: "specific", label: "About this account" },
              { value: "archetype", label: "Pre-call (archetype)" },
            ]}
            onChange={(v) => updateRoom(activeRoom.id, { mode: v })}
          />
          <SelectField<RoomStatus>
            label="Status"
            value={activeRoom.status}
            options={[
              { value: "draft", label: "Draft" },
              { value: "live", label: "Live" },
              { value: "archived", label: "Archived" },
            ]}
            onChange={(v) => updateRoom(activeRoom.id, { status: v })}
          />
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
              Last viewed
            </span>
            <div className="rounded-md border border-border-soft bg-row-hover px-2.5 py-2 text-[13px] text-muted">
              {relativeTime(activeRoom.lastViewedAt)}
            </div>
            <span className="text-[10.5px] leading-[1.4] text-faint">
              Measured, not editable — comes from room telemetry.
            </span>
          </label>
        </Grid>
      </Section>

      <Section
        title="Counterparty"
        hint={`Shown in the sidebar and throughout the room. Changing the ${vocabulary.counterpartyLower}'s name updates every place it appears.`}
      >
        <Grid>
          <TextField
            label="Company"
            value={account.company}
            onChange={(v) => patchAccount({ company: v })}
          />
          <TextField
            label={`${vocabulary.counterparty} name`}
            value={account.counterparty.name}
            placeholder="Not set"
            onChange={(v) =>
              patchAccount({ counterparty: { ...account.counterparty, name: v } })
            }
          />
          <TextField
            label="Title"
            value={account.counterparty.title}
            onChange={(v) =>
              patchAccount({ counterparty: { ...account.counterparty, title: v } })
            }
          />
          <TextField
            label="Organisation"
            value={account.counterparty.org}
            onChange={(v) => patchAccount({ counterparty: { ...account.counterparty, org: v } })}
          />
        </Grid>
      </Section>

      <Section title="Owner" hint="Your side of the room.">
        <Grid cols={3}>
          <TextField
            label="Name"
            value={account.owner.name}
            onChange={(v) => patchAccount({ owner: { ...account.owner, name: v } })}
          />
          <TextField
            label="Title"
            value={account.owner.title}
            onChange={(v) => patchAccount({ owner: { ...account.owner, title: v } })}
          />
          <TextField
            label="Organisation"
            value={account.owner.org}
            onChange={(v) => patchAccount({ owner: { ...account.owner, org: v } })}
          />
        </Grid>
      </Section>
    </div>
  );
}

/* --------------------------------------------------------------- case copy */

export function CaseEditor() {
  const { activeRoom, setField, setListItem } = useRooms();
  const c = activeRoom.content;

  return (
    <div className="flex flex-col gap-5">
      <Section title="Header">
        <Grid>
          <TextField label="Kicker" value={c.kicker} onChange={(v) => setField("kicker", v)} mono />
          <TextField label="Page count" value={c.pageCount} onChange={(v) => setField("pageCount", v)} mono />
        </Grid>
        <TextField label="Headline" value={c.headline} onChange={(v) => setField("headline", v)} multiline rows={2} />
      </Section>

      <Section title="Problem framing" hint="Each line is a connective plus the bracketed claim.">
        <TextField
          label="Section label"
          value={c.framingLabel}
          onChange={(v) => setField("framingLabel", v)}
          mono
        />
        <div className="flex flex-col gap-2">
          {c.framing.map((line) => (
            <ListRow key={line.id}>
              <Grid>
                <TextField
                  label="Lead"
                  value={line.lead}
                  onChange={(v) => setListItem("framing", line.id, { lead: v })}
                />
                <TextField
                  label="Claim"
                  value={line.value}
                  onChange={(v) => setListItem("framing", line.id, { value: v })}
                />
              </Grid>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Stats">
        <Grid>
          <TextField label="Section label" value={c.statsLabel} onChange={(v) => setField("statsLabel", v)} mono />
          <TextField label="Source note" value={c.statsSource} onChange={(v) => setField("statsSource", v)} />
        </Grid>
        <div className="flex flex-col gap-2">
          {c.stats.map((stat) => (
            <ListRow key={stat.id}>
              <Grid cols={3}>
                <TextField
                  label="Value"
                  value={stat.value}
                  onChange={(v) => setListItem("stats", stat.id, { value: v })}
                />
                <TextField
                  label="Unit"
                  value={stat.unit ?? ""}
                  onChange={(v) => setListItem("stats", stat.id, { unit: v })}
                />
                <SelectField
                  label="Accent"
                  value={stat.accent}
                  options={[
                    { value: "navy", label: "Navy" },
                    { value: "red", label: "Red" },
                  ]}
                  onChange={(v) => setListItem("stats", stat.id, { accent: v })}
                />
              </Grid>
              <TextField
                label="Caption"
                value={stat.label}
                onChange={(v) => setListItem("stats", stat.id, { label: v })}
              />
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="What changes">
        <TextField label="Section label" value={c.changesLabel} onChange={(v) => setField("changesLabel", v)} mono />
        <TextField
          label="Body"
          value={c.changesBody}
          onChange={(v) => setField("changesBody", v)}
          multiline
          rows={4}
        />
        <div className="flex flex-col gap-2">
          {c.changesBullets.map((b) => (
            <ListRow key={b.id}>
              <TextField
                label="Bullet"
                value={b.text}
                onChange={(v) => setListItem("changesBullets", b.id, { text: v })}
              />
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Year one">
        <Grid>
          <TextField label="Section label" value={c.yearOneLabel} onChange={(v) => setField("yearOneLabel", v)} mono />
          <TextField label="Headline figure" value={c.yearOneValue} onChange={(v) => setField("yearOneValue", v)} />
        </Grid>
        <TextField label="Caption" value={c.yearOneCaption} onChange={(v) => setField("yearOneCaption", v)} />
        <div className="flex flex-col gap-2">
          {c.yearOneRows.map((row) => (
            <ListRow key={row.id}>
              <Grid cols={3}>
                <TextField
                  label="Label"
                  value={row.label}
                  onChange={(v) => setListItem("yearOneRows", row.id, { label: v })}
                />
                <TextField
                  label="Value"
                  value={row.value}
                  onChange={(v) => setListItem("yearOneRows", row.id, { value: v })}
                />
                <SelectField
                  label="Accent"
                  value={row.accent}
                  options={[
                    { value: "ink", label: "Default" },
                    { value: "green", label: "Green" },
                  ]}
                  onChange={(v) => setListItem("yearOneRows", row.id, { accent: v })}
                />
              </Grid>
            </ListRow>
          ))}
        </div>
        <TextField
          label="Footnote"
          value={c.yearOneFootnote}
          onChange={(v) => setField("yearOneFootnote", v)}
          multiline
          rows={2}
        />
      </Section>

      <Section title="Plan">
        <TextField label="Section label" value={c.nextLabel} onChange={(v) => setField("nextLabel", v)} mono />
        <div className="flex flex-col gap-2">
          {c.weeks.map((w) => (
            <ListRow key={w.id}>
              <Grid>
                <TextField
                  label="Marker"
                  value={w.num}
                  onChange={(v) => setListItem("weeks", w.id, { num: v })}
                  mono
                />
                <TextField
                  label="Title"
                  value={w.title}
                  onChange={(v) => setListItem("weeks", w.id, { title: v })}
                />
              </Grid>
              <TextField
                label="Detail"
                value={w.sub}
                onChange={(v) => setListItem("weeks", w.id, { sub: v })}
              />
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Footer">
        <Grid>
          <TextField label="Note" value={c.footerNote} onChange={(v) => setField("footerNote", v)} />
          <TextField label="Reference" value={c.footerRef} onChange={(v) => setField("footerRef", v)} mono />
        </Grid>
      </Section>
    </div>
  );
}

/* ----------------------------------------------------------------- sources */

export function SourcesEditor() {
  const { activeRoom, updateRoom, toggleSource, renameSource, regenerate, status, error, isLive } =
    useRooms();

  const addSource = () =>
    updateRoom(activeRoom.id, {
      sources: [
        ...activeRoom.sources,
        { id: `src-${Math.random().toString(36).slice(2, 8)}`, label: "New source", used: true },
      ],
    });

  const removeSource = (id: string) =>
    updateRoom(activeRoom.id, { sources: activeRoom.sources.filter((s) => s.id !== id) });

  return (
    <Section
      title="Generation sources"
      hint="What the 1-pager is built from. Toggling a source off removes the figures it underwrites on the next regeneration."
    >
      {activeRoom.sources.length === 0 && (
        <p className="m-0 text-[12.5px] text-muted">No sources yet.</p>
      )}
      <div className="flex flex-col gap-2">
        {activeRoom.sources.map((s) => (
          <ListRow key={s.id} onRemove={() => removeSource(s.id)}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <TextField label="Source" value={s.label} onChange={(v) => renameSource(s.id, v)} />
              <button
                onClick={() => toggleSource(s.id)}
                aria-pressed={s.used}
                className={`h-[34px] cursor-pointer rounded-md border px-3 font-mono text-[10px] transition-colors ${
                  s.used
                    ? "border-green/40 bg-green-bg text-green"
                    : "border-border bg-white text-faintest"
                }`}
              >
                {s.used ? "USED" : "SKIPPED"}
              </button>
            </div>
          </ListRow>
        ))}
      </div>

      {error && <p className="m-0 text-[11.5px] text-red">{error}</p>}

      <div className="flex items-center gap-2">
        <Button onClick={addSource}>Add source</Button>
        <Button variant="primary" onClick={regenerate} disabled={status === "working"}>
          {status === "working" ? "Regenerating…" : "Regenerate 1-pager"}
        </Button>
      </div>
      {!isLive && (
        <p className="m-0 text-[10.5px] leading-[1.45] text-faint">
          AI generation is disconnected — regenerate rebuilds the draft from the selected sources
          locally.
        </p>
      )}
    </Section>
  );
}

/* --------------------------------------------------------------- documents */

export function DocumentsEditor() {
  const { activeRoom, updateRoom } = useRooms();
  const docs = activeRoom.documents;

  const patchDoc = (id: string, patch: Partial<(typeof docs)[number]>) =>
    updateRoom(activeRoom.id, {
      documents: docs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });

  const addDoc = () =>
    updateRoom(activeRoom.id, {
      documents: [
        ...docs,
        {
          id: `doc-${Math.random().toString(36).slice(2, 8)}`,
          group: "Built for you",
          ext: "PDF",
          name: "Untitled document",
          meta: "Added just now",
          kicker: "Document",
          docTitle: "Untitled document",
          pages: 1,
          unread: false,
          rows: [],
          body: "",
          summary: [],
        },
      ],
    });

  return (
    <Section title="Documents" hint="Files listed in the room's Documents tab.">
      {docs.length === 0 && <p className="m-0 text-[12.5px] text-muted">No documents yet.</p>}
      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <ListRow
            key={d.id}
            onRemove={() =>
              updateRoom(activeRoom.id, { documents: docs.filter((x) => x.id !== d.id) })
            }
          >
            <Grid>
              <TextField label="Name" value={d.name} onChange={(v) => patchDoc(d.id, { name: v })} />
              <TextField label="Meta" value={d.meta} onChange={(v) => patchDoc(d.id, { meta: v })} />
            </Grid>
            <Grid cols={3}>
              <SelectField
                label="Group"
                value={d.group}
                options={[
                  { value: "Built for you", label: "Built for you" },
                  { value: "From Meridian", label: "From counterparty" },
                  { value: "From 1Fort", label: "From us" },
                ]}
                onChange={(v) => patchDoc(d.id, { group: v })}
              />
              <SelectField
                label="Type"
                value={d.ext}
                options={[
                  { value: "PDF", label: "PDF" },
                  { value: "XLSX", label: "XLSX" },
                  { value: "DOCX", label: "DOCX" },
                ]}
                onChange={(v) => patchDoc(d.id, { ext: v })}
              />
              <TextField
                label="Pages"
                value={String(d.pages)}
                onChange={(v) => patchDoc(d.id, { pages: Number(v) || 0 })}
              />
            </Grid>
            <AssetPicker
              label="File"
              assetId={d.assetId}
              onChange={(assetId) => patchDoc(d.id, { assetId })}
            />
          </ListRow>
        ))}
      </div>
      <div>
        <Button onClick={addDoc}>Add document</Button>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ videos */

export function VideosEditor() {
  const { activeRoom, updateRoom } = useRooms();
  const { videos, library, curatedVideoIds } = activeRoom;
  const all = [...videos, ...library];
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const inRoom = curatedVideoIds
    .map((id) => all.find((v) => v.id === id))
    .filter((v) => v !== undefined);
  const notInRoom = all.filter((v) => !curatedVideoIds.includes(v.id));

  const setCurated = (ids: string[]) => updateRoom(activeRoom.id, { curatedVideoIds: ids });

  /** A video may live in either list; patch whichever holds it. */
  const patchVideo = (id: string, patch: Partial<RoomVideo>) =>
    updateRoom(activeRoom.id, {
      videos: videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      library: library.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  const setVideoPoster = (id: string, posterAssetId: string | undefined) =>
    patchVideo(id, { posterAssetId });

  function addVideo() {
    if (!newTitle.trim()) return;
    const video: RoomVideo = {
      id: `vid-${Math.random().toString(36).slice(2, 9)}`,
      url: newUrl.trim() || undefined,
      kicker: "Answer",
      title: newTitle.trim(),
      dur: "",
      by: activeRoom.account.owner.name,
      placeholder: "Add a poster frame",
      chapters: [],
      watched: "",
      pct: 0,
      note: "",
    };
    // Straight into the room: a rep adding one almost always wants it seen.
    updateRoom(activeRoom.id, {
      videos: [...videos, video],
      curatedVideoIds: [...curatedVideoIds, video.id],
    });
    setNewTitle("");
    setNewUrl("");
  }

  function removeVideo(id: string) {
    updateRoom(activeRoom.id, {
      videos: videos.filter((v) => v.id !== id),
      library: library.filter((v) => v.id !== id),
      curatedVideoIds: curatedVideoIds.filter((v) => v !== id),
    });
  }

  const move = (id: string, delta: number) => {
    const i = curatedVideoIds.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= curatedVideoIds.length) return;
    const next = [...curatedVideoIds];
    [next[i], next[j]] = [next[j], next[i]];
    setCurated(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Add a video answer"
        hint="Paste a Loom, Vidyard, YouTube or Vimeo link. A link plays for the counterparty straight away with nothing to host — or upload the file under Assets and attach it below."
      >
        <Grid>
          <TextField
            label="Title"
            value={newTitle}
            onChange={setNewTitle}
            placeholder="Why this is worth a pilot"
          />
          <TextField
            label="Link"
            value={newUrl}
            onChange={setNewUrl}
            placeholder="https://www.loom.com/share/…"
            hint={providerName(newUrl) ? `Recognised: ${providerName(newUrl)}` : undefined}
          />
        </Grid>
        <div>
          <Button variant="primary" onClick={addVideo} disabled={!newTitle.trim()}>
            Add to the room
          </Button>
        </div>
      </Section>

      <Section
        title="Visible in the room"
        hint="Order here is the order the counterparty sees."
      >
        {inRoom.length === 0 && <p className="m-0 text-[12.5px] text-muted">Nothing visible yet.</p>}
        <div className="flex flex-col gap-2">
          {inRoom.map((v, i) => (
            <ListRow key={v.id} onRemove={() => setCurated(curatedVideoIds.filter((x) => x !== v.id))}>
              <TextField
                label="Link"
                value={v.url ?? ""}
                onChange={(url) => patchVideo(v.id, { url: url.trim() || undefined })}
                placeholder="https://www.loom.com/share/…"
                hint={
                  providerName(v.url)
                    ? `Plays via ${providerName(v.url)}`
                    : "No link yet — nothing will play"
                }
              />
              <AssetPicker
                label="Or an uploaded video"
                kind="video"
                assetId={v.videoAssetId}
                onChange={(videoAssetId) => patchVideo(v.id, { videoAssetId })}
              />
              <AssetPicker
                label="Poster frame"
                kind="image"
                assetId={v.posterAssetId}
                onChange={(posterAssetId) => setVideoPoster(v.id, posterAssetId)}
              />
              <div>
                <Button variant="danger" onClick={() => removeVideo(v.id)}>
                  Delete this video
                </Button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-bold text-gray-900">{v.title}</span>
                  <span className="text-[11px] text-faint">
                    {v.kicker} · {v.dur}
                  </span>
                </div>
                <div className="flex flex-none gap-1">
                  <Button onClick={() => move(v.id, -1)} disabled={i === 0} title="Move up">
                    ↑
                  </Button>
                  <Button
                    onClick={() => move(v.id, 1)}
                    disabled={i === inRoom.length - 1}
                    title="Move down"
                  >
                    ↓
                  </Button>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title="Library" hint="Recorded but not shown in this room.">
        {notInRoom.length === 0 && (
          <p className="m-0 text-[12.5px] text-muted">Everything is in the room.</p>
        )}
        <div className="flex flex-col gap-2">
          {notInRoom.map((v) => (
            <ListRow key={v.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-bold text-gray-900">{v.title}</span>
                  <span className="text-[11px] text-faint">
                    {v.kicker} · {v.dur}
                  </span>
                </div>
                <Button onClick={() => setCurated([...curatedVideoIds, v.id])}>Add to room</Button>
              </div>
            </ListRow>
          ))}
        </div>
      </Section>
    </div>
  );
}
