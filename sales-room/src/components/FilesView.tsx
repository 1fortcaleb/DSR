import { useState } from "react";
import type { Audience, DocExt } from "../types";
import { DOCUMENTS, DOCUMENT_GROUP_ORDER } from "../data/salesRoom";
import { DownloadIcon, LockIcon, PlusIcon, SearchIcon, SparkleIcon } from "./icons";

interface FilesViewProps {
  audience: Audience;
}

const chipColor: Record<DocExt, string> = {
  PDF: "text-red",
  XLSX: "text-green",
  DOCX: "text-blue",
};

export function FilesView({ audience }: FilesViewProps) {
  const isRep = audience === "rep";
  const [activeId, setActiveId] = useState(DOCUMENTS[1].id);
  const active = DOCUMENTS.find((d) => d.id === activeId) ?? DOCUMENTS[0];

  return (
    <div className="grid h-screen grid-cols-[minmax(260px,340px)_minmax(0,1fr)] items-start">
      <div className="box-border h-screen overflow-y-auto border-r border-border bg-white pt-[34px] pb-10">
        <div className="flex flex-col gap-4 px-[26px] pb-5">
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.015em] text-navy">Documents</h2>
          <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
            <SearchIcon className="text-faint" />
            <span className="text-xs text-faint">Search all six documents</span>
          </div>
        </div>

        <div className="flex flex-col">
          {DOCUMENT_GROUP_ORDER.map((label) => {
            const files = DOCUMENTS.filter((d) => d.group === label);
            return (
              <div key={label} className="flex flex-col">
                <div className="flex items-center justify-between px-[26px] pt-[18px] pb-2">
                  <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{label}</span>
                  <span className="font-mono text-[10px] text-faintest">{files.length}</span>
                </div>
                {files.map((file) => {
                  const isActive = file.id === activeId;
                  return (
                    <button
                      key={file.id}
                      onClick={() => setActiveId(file.id)}
                      className={`grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-soft px-[26px] py-[11px] text-left transition-colors hover:bg-row-hover ${
                        isActive ? "bg-blue-bg shadow-[inset_2px_0_0_#2280EE]" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-border bg-white font-mono text-[8px] tracking-[0.04em] font-medium ${chipColor[file.ext]}`}
                      >
                        {file.ext}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1 text-left">
                        <span
                          className={`overflow-hidden text-ellipsis whitespace-nowrap text-[13px] ${
                            isActive ? "font-bold text-navy" : "font-normal text-body"
                          }`}
                        >
                          {file.name}
                        </span>
                        <span className="text-[11px] text-faint">{file.meta}</span>
                      </span>
                      <span
                        className={`h-1.5 w-1.5 flex-none rounded-full ${file.unread ? "bg-blue" : "bg-transparent"}`}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="px-[26px] pt-[26px]">
          <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-dashed bg-white px-3 py-3 font-sans text-xs font-bold text-muted transition-all hover:border-blue hover:bg-blue-bg hover:text-blue">
            <PlusIcon />
            {isRep ? "Request a document from Meridian" : "Upload a document for Rachel"}
          </button>
        </div>
      </div>

      <div className="box-border h-screen overflow-y-auto bg-panel">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-5 border-b border-border-soft bg-panel/95 px-8 py-[18px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-sm font-bold text-gray-900">{active.name}</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-faint uppercase">{active.meta}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 font-sans text-xs font-bold text-gray-800 transition-all hover:border-faintest hover:bg-row-hover">
              <DownloadIcon />
              Download
            </button>
            <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-[5px] border-none bg-blue px-3.5 py-[9px] font-sans text-xs font-bold text-white transition-all hover:bg-blue-hover active:translate-y-px">
              Share
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-8 px-8 pt-[34px] pb-20">
          <div className="flex max-w-[720px] min-w-0 flex-1 basis-[420px] flex-col">
            <div className="box-border flex min-h-[640px] flex-col gap-8 rounded-lg border border-border-soft bg-white px-14 pt-[54px] pb-12 shadow-[0_1px_2px_rgba(0,1,46,0.04),0_26px_52px_-38px_rgba(0,1,46,0.2)]">
              <div className="flex items-start justify-between gap-5">
                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase">{active.kicker}</span>
                  <span className="text-[26px] leading-[1.2] font-bold tracking-[-0.02em] text-navy">
                    {active.docTitle}
                  </span>
                </div>
              </div>
              <div className="h-0.5 bg-border-soft" />
              <div className="flex flex-col gap-0">
                {active.rows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-6 border-b border-border py-[15px]"
                  >
                    <span className="font-mono text-[10px] tracking-[0.1em] text-[#7E8186] uppercase">
                      {row.label}
                    </span>
                    <span className="text-right text-sm font-bold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="m-0 text-[12.5px] leading-[1.7] text-body">{active.body}</p>
              <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-4">
                <span className="text-[10px] text-faint">Meridian Risk Partners · Confidential</span>
                <span className="font-mono text-[10px] text-faint">Page 1 of {active.pages}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-5">
              <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
                Page 1 / {active.pages}
              </span>
            </div>
          </div>

          <div className="flex max-w-[340px] min-w-0 flex-1 basis-[260px] flex-col gap-5">
            <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
              <div className="flex items-center gap-2">
                <SparkleIcon className="text-blue" />
                <span className="text-[12.5px] font-bold text-gray-900">What this says</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
                {active.summary.map((point) => (
                  <li key={point} className="flex gap-[9px] text-xs leading-[1.55] text-body">
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-blue" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {isRep && (
              <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
                <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
                  Who has opened it
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-bg-soft text-[9.5px] font-bold text-blue">
                      DW
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-body">Dana Whitfield</span>
                      <span className="text-[10.5px] text-faint">4 opens · 6m 12s total</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9.5px] font-bold text-muted">
                      PT
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-body">Paul Trainor, CFO</span>
                      <span className="text-[10.5px] text-faint">1 open · 58s</span>
                    </span>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-muted">Link access</span>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-green">
                    <LockIcon />
                    Room members only
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
