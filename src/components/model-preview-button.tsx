"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

// three.js loads only when someone opens a model, not with the page.
const ModelViewer = dynamic(() => import("./model-viewer"), {
  ssr: false,
  loading: () => (
    <div className="model-viewer">
      <div className="model-canvas" />
      <div className="model-status" role="status">
        <span className="spinner" aria-hidden="true" />
        Loading viewer
      </div>
    </div>
  ),
});

export function ModelPreviewButton({ url, fileName, downloadUrl }: { url: string; fileName: string; downloadUrl?: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        View in 3D
      </button>
      <dialog
        ref={dialog}
        className="model-dialog"
        aria-label={fileName}
        onClose={() => setOpen(false)}
        // A click on the backdrop lands on the dialog itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="model-dialog-body">
          <div className="model-dialog-head">
            <h2 className="file-name">{fileName}</h2>
            <div className="row-actions">
              {downloadUrl && (
                <a className="btn btn-secondary" href={downloadUrl}>
                  Download
                </a>
              )}
              <button type="button" className="btn btn-primary" onClick={() => dialog.current?.close()}>
                Close
              </button>
            </div>
          </div>
          {/* Unmounted on close, which frees the model's GPU memory. */}
          {open && <ModelViewer url={url} title={fileName} />}
        </div>
      </dialog>
    </>
  );
}
