import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import "./DropZone.css";

interface DropZoneProps {
  onFilesSelected: (paths: string[]) => void;
}

export function DropZone(props: DropZoneProps) {
  const [isDragging, setIsDragging] = createSignal(false);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // Note: Actual file dropping is handled by the global tauri://file-drop event in App.tsx
  };

  const handleClick = async () => {
    console.log('clicked');

    try {
      const selected = await open({
        multiple: true,
        directory: false,
        // filters: [{
        //   name: 'Images',
        //   extensions: ['png', 'jpg', 'jpeg', 'webp']
        // }]
      });

      if (selected) {
        // selected can be string (single) or string[] (multiple) or null
        const paths = Array.isArray(selected) ? selected : [selected];
        props.onFilesSelected(paths);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  return (
    <div
      class={`drop-zone ${isDragging() ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div class="icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <p>Drag & Drop images here</p>
      <span class="sub-text">or click to browse</span>
    </div>
  );
}
