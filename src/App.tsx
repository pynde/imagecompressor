import { createSignal, Index, Show, onMount, onCleanup, type Accessor, createEffect } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";
import { DropZone } from "./components/DropZone";
import { Dimensions } from "./components/Dimensions";
import { GlobalDimensions, type ResizeMode } from "./components/GlobalDimensions";
import { Save } from "./components/Save";
import { FormatSettings, type OutputFormat } from "./components/FormatSettings";
import { info } from "@tauri-apps/plugin-log";

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
}

interface ImageFile extends ImageMetadata {
  path: string;
  name: string;
  targetWidth?: number;
  targetHeight?: number;
  useCustomDimensions?: boolean;
}

function App() {
  const [files, setFiles] = createSignal<ImageFile[]>([]);
  const [globalMode, setGlobalMode] = createSignal<ResizeMode>("percentage");
  const [globalWidth, setGlobalWidth] = createSignal<number>(1920);
  const [globalHeight, setGlobalHeight] = createSignal<number>(1080);
  const [globalPercentage, setGlobalPercentage] = createSignal<number>(100);
  const [outputFormat, setOutputFormat] = createSignal<OutputFormat>("keeporiginal");
  const [quality, setQuality] = createSignal<number>(75);

  const processFiles = async (paths: string[]) => {
    const newFiles: ImageFile[] = [];

    for (const path of paths) {
      try {
        const metadata = await invoke<ImageMetadata>("get_image_metadata", { path });
        const name = path.split(/[/\\]/).pop() || path;

        newFiles.push({
          path,
          name,
          ...metadata,
          useCustomDimensions: false,
        });
      } catch (e) {
        console.error(`Failed to process ${path}:`, e);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleGlobalChange = (mode: ResizeMode, width?: number, height?: number, percentage?: number) => {
    setGlobalMode(mode);
    if (mode === "absolute" && width !== undefined && height !== undefined) {
      setGlobalWidth(width);
      setGlobalHeight(height);
    } else if (mode === "percentage" && percentage !== undefined) {
      setGlobalPercentage(percentage);
    }
  };

  // Apply global settings to all images that don't have custom dimensions
  createEffect(() => {
    const mode = globalMode();
    const width = globalWidth();
    const height = globalHeight();
    const percentage = globalPercentage();

    setFiles((prev) =>
      prev.map((file) => {
        if (file.useCustomDimensions) {
          return file;
        }

        if (mode === "percentage") {
          return {
            ...file,
            targetWidth: Math.round((file.width * percentage) / 100),
            targetHeight: Math.round((file.height * percentage) / 100),
          };
        } else {
          return {
            ...file,
            targetWidth: width,
            targetHeight: height,
          };
        }
      })
    );
  });

  const toggleCustomDimensions = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        useCustomDimensions: !updated[index].useCustomDimensions,
      };
      return updated;
    });
  };

  const getTargetDimensions = (file: ImageFile) => {
    if (file.targetWidth && file.targetHeight) {
      return `${file.targetWidth} × ${file.targetHeight}`;
    }
    return "Not set";
  };

  onMount(async () => {
    const unlisten = await listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      info("Drag drop event received: " + JSON.stringify(event));
      if (event.payload && event.payload.paths) {
        processFiles(event.payload.paths);
      }
    });

    onCleanup(() => unlisten());
  });

  return (
    <div class="w-full h-screen p-8 text-center flex flex-col overflow-auto bg-slate-500">
      <h1 class="text-5xl font-bold leading-tight mb-2">Image Compressor</h1>
      <p class="text-xl text-gray-400 mb-8">Compress and convert your images locally.</p>

      <div class="flex flex-col items-center justify-center flex-1 gap-8 w-full overflow-auto">
        <DropZone onFilesSelected={processFiles} />

        <Show when={files().length > 0}>
          <div class="w-full max-w-4xl text-left bg-white/5 p-6 rounded-xl border border-white/10">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
              <h3 class="text-xl font-semibold">Selected Files ({files().length})</h3>
              <button
                onClick={clearAllFiles}
                class="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium cursor-pointer transition-all hover:bg-red-500/20 hover:border-red-500/50 hover:-translate-y-0.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-5 h-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Clear All
              </button>
            </div>

            <GlobalDimensions onGlobalChange={handleGlobalChange} />

            <FormatSettings
              onFormatChange={(format, qual) => {
                setOutputFormat(format);
                setQuality(qual);
              }}
            />

            <div class="mt-6">
              <h4 class="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4">Images</h4>
              <Index each={files()}>
                {(file: Accessor<ImageFile>, index) => (
                  <div class="py-4 border-b border-white/5 last:border-b-0">
                    <div class="flex items-center gap-4">
                      <img
                        src={convertFileSrc(file().path)}
                        alt={file().name}
                        class="w-15 h-15 object-cover rounded-lg border border-white/10 shrink-0"
                      />
                      <div class="flex flex-col gap-1 flex-1">
                        <span class="font-medium">{file().name}</span>
                        <span class="text-sm text-gray-400">
                          {file().width} × {file().height} → {getTargetDimensions(file())}
                        </span>
                      </div>
                      <div class="flex gap-2 items-center">
                        <button
                          onClick={() => toggleCustomDimensions(index)}
                          title={file().useCustomDimensions ? "Use global settings" : "Use custom dimensions"}
                          class={`w-9 h-9 p-2 rounded-lg border transition-all flex items-center justify-center ${file().useCustomDimensions
                            ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="w-5 h-5"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFile(index)}
                          title="Remove image"
                          class="w-9 h-9 p-2 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer transition-all flex items-center justify-center text-red-400 shrink-0 hover:bg-red-500/20 hover:border-red-500/40 hover:scale-105"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="w-5 h-5"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <Show when={file().useCustomDimensions}>
                      <div class="mt-4 pt-4 border-t border-white/5 animate-[slideDown_0.2s_ease-out]">
                        <Dimensions
                          originalWidth={file().width}
                          originalHeight={file().height}
                          onDimensionsChange={(width, height) => {
                            setFiles((prev) => {
                              const updated = [...prev];
                              updated[index] = { ...updated[index], targetWidth: width, targetHeight: height };
                              return updated;
                            });
                          }}
                        />
                      </div>
                    </Show>
                  </div>
                )}
              </Index>
            </div>

            <Save
              images={files().map((file) => ({
                path: file.path,
                targetWidth: file.targetWidth || file.width,
                targetHeight: file.targetHeight || file.height,
                outputFormat: outputFormat(),
                quality: quality(),
              }))}
              disabled={files().length === 0}
            />
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
