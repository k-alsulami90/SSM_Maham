import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import * as D from "../data/mock.js";
import { putFile, getFile, delFile } from "../store/fileStore.js";

const DOC_TINT = {
  pdf: "var(--hue-urgent)",
  img: "var(--hue-med)",
  xls: "var(--acc-moss)",
  doc: "var(--hue-high)",
  file: "var(--ink-400)",
};

function docKind(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(ext)) return "img";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "xls";
  if (["doc", "docx", "pages", "txt", "md", "rtf"].includes(ext)) return "doc";
  return "file";
}
function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return Math.round(n / 1024) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

/* Documents / attachments — click-to-pick + drag-and-drop upload.
   Blobs persist in IndexedDB (survive reload / offline); object URLs are
   resolved per session and revoked on unmount. */
export default function DocumentsSection({ task, lang, t, currentUserId, dispatch, bare }) {
  const [drag, setDrag] = useState(false);
  const [urls, setUrls] = useState({}); // attachment id -> objectURL
  const inputRef = useRef(null);
  const files = task.attachments || [];

  // Resolve persisted blobs into object URLs.
  useEffect(() => {
    let cancelled = false;
    const created = [];
    (async () => {
      for (const f of files) {
        if (f.stored && !urls[f.id]) {
          const blob = await getFile(f.id);
          if (blob && !cancelled) {
            const u = URL.createObjectURL(blob);
            created.push(u);
            setUrls((m) => ({ ...m, [f.id]: u }));
          }
        }
      }
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, files.length]);

  async function addFiles(list) {
    const arr = [];
    for (const f of Array.from(list)) {
      const id = "up-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      await putFile(id, f);
      arr.push({
        id,
        name: f.name,
        kind: docKind(f.name),
        size: fmtBytes(f.size),
        stored: true,
        who: currentUserId,
        at: lang === "ar" ? "الآن" : "Just now",
      });
    }
    dispatch({ type: "ADD_ATTACHMENTS", id: task.id, files: arr });
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  const removeFile = (f) => {
    if (f.stored) delFile(f.id);
    if (urls[f.id]) URL.revokeObjectURL(urls[f.id]);
    dispatch({ type: "REMOVE_ATTACHMENT", id: task.id, attachmentId: f.id });
  };

  return (
    <div>
      {!bare && (
        <div className="section-title">
          {t.documents}
          {files.length > 0 && <span className="muted mono" style={{ fontSize: 11 }}> · {files.length}</span>}
        </div>
      )}
      <div className="docs">
        {files.map((f) => {
          const who = D.findUser(f.who);
          const name = lang === "ar" && f.ar ? f.ar : f.name;
          const href = urls[f.id] || f.url;
          return (
            <div className="doc-row" key={f.id}>
              <span className="doc-ico" style={{ color: DOC_TINT[f.kind] || DOC_TINT.file }}>
                <Icon name="file" size={15} />
              </span>
              <div className="doc-meta">
                <div className="doc-name" dir="auto" title={name}>{name}</div>
                <div className="doc-sub mono">
                  {f.size}
                  {who ? ` · ${t.added_by} ${D.userName(who, lang)}` : ""} · {f.at}
                </div>
              </div>
              <div className="doc-actions">
                {href && (
                  <a className="icon-btn ic" href={href} target="_blank" rel="noopener noreferrer" title={t.open} aria-label={t.open}>
                    <Icon name="download" size={14} />
                  </a>
                )}
                <button className="icon-btn ic" title={t.remove} aria-label={t.remove} onClick={() => removeFile(f)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className={`doc-drop ${drag ? "over" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <Icon name="upload" size={15} />
          <span>{files.length ? t.upload_file : t.drop_hint}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
