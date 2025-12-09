import { createSignal, createEffect, onMount, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { OutputFormat } from "./FormatSettings";

export interface ImageSaveRequest {
    sourcePath: string;
    targetWidth: number;
    targetHeight: number;
    outputFormat: OutputFormat;
    quality: number;
}

interface SaveOptionsModalProps {
    images: ImageSaveRequest[];
    targetFolder: string;
    onConfirm: (finalImages: any[]) => void;
    onCancel: () => void;
}

interface FileItem {
    id: number;
    request: ImageSaveRequest;
    filename: string; // Editable part (no extension)
    extension: string; // Fixed
    status: "checking" | "ok" | "exists";
}

export function SaveOptionsModal(props: SaveOptionsModalProps) {
    const [items, setItems] = createSignal<FileItem[]>([]);
    const [isSaving, setIsSaving] = createSignal(false);

    // Initial setup
    onMount(async () => {
        const initialItems: FileItem[] = await Promise.all(props.images.map(async (img, idx) => {
            const sourceName = img.sourcePath.split(/[\\/]/).pop() || "image";
            const stem = sourceName.substring(0, sourceName.lastIndexOf(".")) || sourceName;

            // Determine extension
            let ext = "png";
            if (img.outputFormat === "png") ext = "png";
            else if (img.outputFormat === "jpeg") ext = "jpg";
            else if (img.outputFormat === "webp") ext = "webp";
            else if (img.outputFormat === "keeporiginal") {
                ext = sourceName.split(".").pop() || "png";
            }

            // Default filename pattern
            const defaultName = `${stem}_resized_${img.targetWidth}x${img.targetHeight}`;

            return {
                id: idx,
                request: img,
                filename: defaultName,
                extension: ext,
                status: "checking" as const
            };
        }));

        setItems(initialItems);
        checkAllFiles(initialItems);
    });

    const checkAllFiles = async (currentItems: FileItem[]) => {
        const checked = await Promise.all(currentItems.map(async (item) => {
            const fullPath = `${props.targetFolder}/${item.filename}.${item.extension}`;
            try {
                const exists = await invoke<boolean>("check_file_exists", { path: fullPath });
                return { ...item, status: exists ? "exists" : "ok" } as FileItem;
            } catch (e) {
                console.error("Check failed", e);
                return { ...item, status: "ok" } as FileItem; // As a fallback
            }
        }));
        setItems(checked);
    };

    const handleNameChange = (id: number, newName: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, filename: newName, status: "checking" };
            }
            return item;
        }));

        // Debounce check? For now just check immediately after a small delay or on blur.
        // Let's check immediately for simplicity, or maybe wait for blur?
        // Checking on every keystroke might be too much if typing fast.
    };

    const handleBlur = (id: number) => {
        const item = items().find(i => i.id === id);
        if (item) {
            checkFile(item);
        }
    };

    const checkFile = async (item: FileItem) => {
        const fullPath = `${props.targetFolder}/${item.filename}.${item.extension}`;
        const exists = await invoke<boolean>("check_file_exists", { path: fullPath });
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: exists ? "exists" : "ok" } : i));
    };

    const handleConfirm = () => {
        // Construct the final list for Rust
        const finalImages = items().map(item => ({
            path: item.request.sourcePath,
            destination_path: `${props.targetFolder}/${item.filename}.${item.extension}`,
            target_width: item.request.targetWidth,
            target_height: item.request.targetHeight,
            output_format: item.request.outputFormat,
            quality: item.request.quality
        }));

        props.onConfirm(finalImages);
    };

    return (
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 class="text-xl font-bold text-gray-800">Save Options</h3>
                    <button onClick={props.onCancel} class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="p-4 bg-indigo-50 border-b border-indigo-100">
                    <p class="text-indigo-800 text-sm">
                        Saving to: <span class="font-mono font-bold">{props.targetFolder}</span>
                    </p>
                </div>

                <div class="flex-1 overflow-y-auto p-4">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th class="p-3">Preview</th>
                                <th class="p-3 w-1/2">Filename</th>
                                <th class="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <For each={items()}>
                                {(item) => (
                                    <tr class="hover:bg-gray-50">
                                        <td class="p-3">
                                            {/* Could show thumbnail here if we had it, for now just an icon */}
                                            <div class="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xl">
                                                🖼️
                                            </div>
                                        </td>
                                        <td class="p-3">
                                            <div class="flex items-center">
                                                <input
                                                    type="text"
                                                    value={item.filename}
                                                    onInput={(e) => handleNameChange(item.id, e.currentTarget.value)}
                                                    onBlur={() => handleBlur(item.id)}
                                                    class="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                                />
                                                <span class="p-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-500 font-mono">
                                                    .{item.extension}
                                                </span>
                                            </div>
                                            <div class="text-xs text-gray-400 mt-1">
                                                Original: {item.request.sourcePath.split(/[\\/]/).pop()}
                                            </div>
                                        </td>
                                        <td class="p-3">
                                            <Show when={item.status === "checking"}>
                                                <span class="text-gray-400 flex items-center gap-1">
                                                    Checking...
                                                </span>
                                            </Show>
                                            <Show when={item.status === "ok"}>
                                                <span class="text-green-600 flex items-center gap-1 font-medium">
                                                    ✓ New File
                                                </span>
                                            </Show>
                                            <Show when={item.status === "exists"}>
                                                <div class="flex flex-col">
                                                    <span class="text-amber-600 flex items-center gap-1 font-bold">
                                                        ⚠️ File Exists
                                                    </span>
                                                    <span class="text-xs text-amber-600">Will be overwritten</span>
                                                </div>
                                            </Show>
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>

                <div class="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        {items().filter(i => i.status === "exists").length > 0 ?
                            <span class="text-amber-600 font-medium">Warning: {items().filter(i => i.status === "exists").length} files will be overwritten.</span>
                            : <span>Ready to save {items().length} images.</span>
                        }
                    </div>
                    <div class="flex gap-3">
                        <button
                            onClick={props.onCancel}
                            class="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            class="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
                        >
                            {items().some(i => i.status === "exists") ? "Replace & Save" : "Save Images"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
