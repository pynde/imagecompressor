import { createSignal, Show } from "solid-js";
import { FolderPicker } from "./FolderPicker";
import { info } from "@tauri-apps/plugin-log";

interface DropZoneProps {
  onFilesSelected: (paths: string[]) => void;
}

export function DropZone(props: DropZoneProps) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [showPicker, setShowPicker] = createSignal(false);

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
    info("DOM Drop event detected in DropZone");
    setIsDragging(false);
    // Note: Actual file dropping is handled by the global tauri://file-drop event in App.tsx
  };

  const handleClick = () => {
    setShowPicker(true);
  };

  const handleFileSelection = (paths: string | string[]) => {
    setShowPicker(false);
    if (!paths) return;

    // Ensure array
    const pathList = Array.isArray(paths) ? paths : [paths];
    if (pathList.length > 0) {
      props.onFilesSelected(pathList);
    }
  };

  return (
    <>
      <Show when={showPicker()}>
        <FolderPicker
          mode="files"
          multiple={true}
          filters={["png", "jpg", "jpeg", "webp"]}
          onSelect={handleFileSelection}
          onCancel={() => setShowPicker(false)}
        />
      </Show>

      <div
        class={`
          flex flex-col items-center justify-center gap-4 p-12 
          border-2 border-dashed rounded-xl cursor-pointer 
          transition-all duration-200
          ${isDragging()
            ? 'border-indigo-500 bg-indigo-500/10 scale-105'
            : 'border-white/20 bg-white/5 hover:border-indigo-400 hover:bg-white/10'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div class="text-white/70">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-16 h-16"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <p class="text-lg font-medium">Drag & Drop images here</p>
        <span class="text-sm text-white/50">or click to browse</span>
      </div>
    </>
  );
}
