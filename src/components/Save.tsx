import { createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type { OutputFormat } from "./FormatSettings";
import { FolderPicker } from "./FolderPicker";
import { SaveOptionsModal, ImageSaveRequest } from "./SaveOptionsModal";

interface ImageToSave {
    path: string;
    targetWidth: number;
    targetHeight: number;
    outputFormat: OutputFormat;
    quality: number;
}

interface SaveProps {
    images: ImageToSave[];
    disabled?: boolean;
}

interface SaveResult {
    success: boolean;
    saved_count: number;
}

export function Save(props: SaveProps) {
    const [isSaving, setIsSaving] = createSignal(false);
    const [savedPath, setSavedPath] = createSignal<string | null>(null);
    const [error, setError] = createSignal<string | null>(null);
    const [showFolderPicker, setShowFolderPicker] = createSignal(false);
    const [showSaveOptions, setShowSaveOptions] = createSignal(false);
    const [selectedFolder, setSelectedFolder] = createSignal<string>("");

    const handleSave = () => {
        setShowFolderPicker(true);
    };

    const handleFolderSelected = (selectedPath: string | string[]) => {
        // Since we are in folder mode, selectedPath should always be a string
        if (Array.isArray(selectedPath)) {
            console.warn("Unexpected array path in folder mode:", selectedPath);
            selectedPath = selectedPath[0];
        }

        setSelectedFolder(selectedPath);
        setShowFolderPicker(false);
        setShowSaveOptions(true);
    };

    const handleSaveConfirmed = async (finalImages: any[]) => {
        setShowSaveOptions(false);

        try {
            setError(null);
            setIsSaving(true);
            setSavedPath(null);

            const result = await invoke<SaveResult>("save_images", {
                images: finalImages,
            });

            if (result.success) {
                setSavedPath(selectedFolder());
            }
        } catch (err) {
            console.error("Error saving images:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenFolder = async () => {
        const path = savedPath();
        if (path) {
            try {
                await openPath(path);
            } catch (err) {
                console.error("Error opening folder:", err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                setError(`Failed to open folder: ${errorMsg}`);
            }
        }
    };

    // Convert props.images to ImageSaveRequest format for the modal
    const getImagesForModal = (): ImageSaveRequest[] => {
        return props.images.map(img => ({
            sourcePath: img.path,
            targetWidth: img.targetWidth,
            targetHeight: img.targetHeight,
            outputFormat: img.outputFormat,
            quality: img.quality
        }));
    };

    return (
        <>
            <Show when={showFolderPicker()}>
                <FolderPicker
                    onSelect={handleFolderSelected}
                    onCancel={() => setShowFolderPicker(false)}
                />
            </Show>

            <Show when={showSaveOptions()}>
                <SaveOptionsModal
                    images={getImagesForModal()}
                    targetFolder={selectedFolder()}
                    onConfirm={handleSaveConfirmed}
                    onCancel={() => setShowSaveOptions(false)}
                />
            </Show>

            <div class="relative">
                <Show when={isSaving()}>
                    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div class="flex flex-col items-center gap-4">
                            <div class="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p class="text-lg font-medium">Processing and saving images...</p>
                        </div>
                    </div>
                </Show>

                <div class="flex flex-col gap-4">
                    <div class="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={props.disabled || isSaving()}
                            class="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                />
                            </svg>
                            {isSaving() ? "Saving..." : "Save Images"}
                        </button>

                        <Show when={savedPath()}>
                            <button
                                onClick={handleOpenFolder}
                                class="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-semibold rounded-lg hover:bg-emerald-500/30 transition-all"
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
                                        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                                    />
                                </svg>
                                Open Folder
                            </button>
                        </Show>
                    </div>

                    <Show when={savedPath()}>
                        <div class="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-6 h-6 flex-shrink-0"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span class="text-sm">Images saved successfully to: {savedPath()}</span>
                        </div>
                    </Show>

                    <Show when={error()}>
                        <div class="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-6 h-6 flex-shrink-0"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                />
                            </svg>
                            <span class="text-sm">{error()}</span>
                        </div>
                    </Show>
                </div>
            </div>
        </>
    );
}
