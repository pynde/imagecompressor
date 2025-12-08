import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { DropZone } from "./components/DropZone";

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
}

interface ImageFile extends ImageMetadata {
  path: string;
  name: string;
}

function App() {
  const [files, setFiles] = createSignal<ImageFile[]>([]);

  const processFiles = async (paths: string[]) => {
    const newFiles: ImageFile[] = [];

    for (const path of paths) {
      try {
        const metadata = await invoke<ImageMetadata>("get_image_metadata", { path });
        // Extract filename from path (simple split)
        // Note: In a real app, might want a more robust way or get it from Rust
        const name = path.split(/[/\\]/).pop() || path;

        newFiles.push({
          path,
          name,
          ...metadata,
        });
      } catch (e) {
        console.error(`Failed to process ${path}:`, e);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  onMount(async () => {
    const unlisten = await listen<string[]>("tauri://file-drop", (event) => {
      processFiles(event.payload);
    });

    onCleanup(() => unlisten());
  });

  // Also handle the manual file selection if we implement it later
  // For now, DropZone just visualizes the drop area, but the global listener catches the drop
  // We can pass a dummy handler to DropZone or update DropZone to not handle drop if we rely on global
  // But actually, DropZone's onDrop might catch it before the global listener if we preventDefault?
  // The global listener is usually for OS level drops.
  // If we drop on the webview, the webview events fire.
  // Let's keep DropZone as a visual indicator.

  return (
    <div class="container">
      <h1>Image Compressor</h1>
      <p class="subtitle">Compress and convert your images locally.</p>

      <div class="content">
        {/* We pass a no-op or handle it if we implement file picking dialog later */}
        <DropZone onFilesSelected={processFiles} />

        <Show when={files().length > 0}>
          <div class="file-list">
            <h3>Selected Files:</h3>
            <ul>
              <For each={files()}>
                {(file) => (
                  <li>
                    <div class="file-info">
                      <span class="file-name">{file.name}</span>
                      <span class="file-details">
                        {file.width}x{file.height} • {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
