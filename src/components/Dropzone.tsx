import { useRef, useState } from 'react';
import { useApp } from '../state';

export default function Dropzone() {
  const ingestFiles = useApp((s) => s.ingestFiles);
  const indexing = useApp((s) => s.indexing);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void ingestFiles(Array.from(files));
  };

  return (
    <>
      <div
        className={`dropzone${over ? ' over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        {indexing ? 'Working…' : 'Drop .pdf, .docx, .txt, .md, .zip here — or click to browse'}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.zip"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
