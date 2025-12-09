import { createSignal, For, Show, onMount, createEffect, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { info } from "@tauri-apps/plugin-log";

interface DirectoryEntry {
    name: string;
    path: string;
    is_directory: boolean;
}

interface FolderPickerProps {
    onSelect: (path: string | string[]) => void;
    onCancel: () => void;
    mode?: "folder" | "files"; // Default: "folder"
    filters?: string[]; // Array of extensions without dot, e.g. ["png", "jpg"]
    multiple?: boolean; // Default: false
}

export function FolderPicker(props: FolderPickerProps) {
    const [currentPath, setCurrentPath] = createSignal("");
    const [items, setItems] = createSignal<DirectoryEntry[]>([]);
    const [selectedPaths, setSelectedPaths] = createSignal<string[]>([]);
    const [isLoading, setIsLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const selectedSet = createMemo(() => new Set(selectedPaths()));

    const mode = () => props.mode || "folder";
    const multiple = () => props.multiple || false;

    // Check if a file extension is allowed
    const isExtensionAllowed = (filename: string) => {
        if (!props.filters || props.filters.length === 0) return true;
        const ext = filename.split(".").pop()?.toLowerCase();
        return ext ? props.filters.includes(ext) : false;
    };

    // Load directory contents
    const loadDirectory = async (path: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const entries = await invoke<DirectoryEntry[]>("list_directory", { path });
            setItems(entries);
            setCurrentPath(path);

            // If in folder mode, auto-select current directory
            if (mode() === "folder") {
                setSelectedPaths([path]);
            } else {
                // In file mode, clear selection when changing directory
                setSelectedPaths([]);
            }
        } catch (err) {
            console.error("Error loading directory:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    // Navigate to a folder
    const navigateToFolder = async (path: string) => {
        await loadDirectory(path);
    };

    // Navigate to parent directory
    const navigateUp = async () => {
        try {
            const parentPath = await invoke<string>("get_parent_directory", {
                path: currentPath(),
            });
            await loadDirectory(parentPath);
        } catch (err) {
            console.error("Cannot navigate up:", err);
            // Already at root, ignore error
        }
    };

    // Handle item selection (folder or file)
    const handleItemClick = (item: DirectoryEntry, e: MouseEvent) => {
        if (item.is_directory) {
            // Just navigate if it's a directory
            navigateToFolder(item.path);
            return;
        }

        // Only allow selecting files in "files" mode
        if (mode() !== "files") return;

        // Check filter
        if (!isExtensionAllowed(item.name)) return;

        // Handle selection
        if (multiple()) {
            const current = selectedPaths();
            if (current.includes(item.path)) {
                setSelectedPaths(current.filter(p => p !== item.path));
            } else {
                setSelectedPaths([...current, item.path]);
            }
        } else {
            setSelectedPaths([item.path]);
        }
    };

    // Handle folder selection (confirm button)
    const handleConfirm = () => {
        const paths = selectedPaths();
        if (paths.length > 0) {
            // If mode is folder, assume single selection (the current path)
            // If mode is files, pass user selection
            if (mode() === "folder") {
                // For folder mode, we generally want the current path, which is set in loadDirectory
                // But check if we want to allow selecting a subfolder without entering it?
                // The previous logic was: setSelectedPath(path) was called in loadDirectory.
                // Let's ensure we return the single string for folder mode.
                localStorage.setItem("lastSelectedFolder", paths[0]);
                props.onSelect(paths[0]);
            } else {
                // File mode
                if (multiple()) {
                    props.onSelect(paths);
                } else {
                    props.onSelect(paths[0]);
                }
            }
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
            props.onCancel();
        }
    };

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            props.onCancel();
        }
    };

    // Initialize
    onMount(async () => {
        try {
            // Try to get last selected folder from localStorage
            const lastFolder = localStorage.getItem("lastSelectedFolder");

            if (lastFolder) {
                try {
                    await loadDirectory(lastFolder);
                    console.log("Loaded last selected folder:", lastFolder);
                    return;
                } catch (err) {
                    console.log("Last folder not accessible, falling back to home");
                }
            }

            // Fall back to home directory
            const homePath = await invoke<string>("get_home_directory");
            await loadDirectory(homePath);
        } catch (err) {
            console.error("Error getting home directory:", err);
            setError("Failed to load home directory");
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    });

    // Get breadcrumb parts from current path
    const getBreadcrumbs = () => {
        const path = currentPath();
        if (!path) return [];

        const parts = path.split("/").filter(Boolean);
        const breadcrumbs: { name: string; path: string }[] = [];

        let accumulatedPath = "";
        for (const part of parts) {
            accumulatedPath += "/" + part;
            breadcrumbs.push({
                name: part,
                path: accumulatedPath,
            });
        }

        return breadcrumbs;
    };

    return (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-[60em] animate-[fadeIn_0.2s_ease-out]" onClick={handleBackdropClick}>
            <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
                <div class="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 class="text-lg font-semibold text-gray-800">
                        {mode() === "files" ? (multiple() ? "Select Images" : "Select Image") : "Select Destination Folder"}
                    </h3>
                    <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={props.onCancel} title="Close">
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
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div class="px-4 py-2 bg-gray-50 flex items-center gap-2 text-sm text-gray-600 border-b border-gray-100">
                    <span class="text-indigo-500">📍</span>
                    <span class="font-mono text-xs truncate dir-rtl">{currentPath()}</span>
                </div>

                <div class="flex items-center gap-1 p-2 px-4 overflow-x-auto whitespace-nowrap border-b border-gray-100 text-sm no-scrollbar">
                    <button
                        class="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded flex items-center gap-1 transition-colors"
                        onClick={() => navigateToFolder("/")}
                    >
                        🏠 Root
                    </button>
                    <For each={getBreadcrumbs()}>
                        {(crumb) => (
                            <>
                                <span class="text-gray-300">›</span>
                                <button
                                    class="px-2 py-1 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors"
                                    onClick={() => navigateToFolder(crumb.path)}
                                >
                                    {crumb.name}
                                </button>
                            </>
                        )}
                    </For>
                </div>

                <Show when={error()}>
                    <div class="m-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                        ⚠️ {error()}
                    </div>
                </Show>

                <div class="flex-1 overflow-y-auto p-2 scroll-smooth">
                    <Show when={isLoading()}>
                        <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p>Loading...</p>
                        </div>
                    </Show>

                    <Show when={!isLoading()}>
                        {/* Parent folder entry */}
                        <button class="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 group border border-transparent hover:border-gray-200 mb-1" onClick={navigateUp}>
                            <span class="text-yellow-400 text-xl">📁</span>
                            <span class="flex-1 font-medium text-gray-700">.. (Parent folder)</span>
                            <span class="text-gray-300 group-hover:text-indigo-400 transition-colors">↑</span>
                        </button>

                        {/* Folder and file list */}
                        <For each={items()}>
                            {(item) => {
                                const isAllowed = item.is_directory || (mode() === "files" && isExtensionAllowed(item.name));
                                const isSelected = selectedSet().has(item.path);
                                // Debug logging for selection
                                // if (mode() === "files" && !item.is_directory) {
                                //    console.log(`Item: ${item.name}, Path: ${item.path}, Selected: ${isSelected}, AllSelected:`, selectedPaths());
                                // }

                                return (
                                    <button
                                        class="w-full flex items-center gap-3 rounded-lg text-left"
                                        classList={{
                                            // Selected file
                                            "bg-indigo-600 shadow-md text-yellow-400":
                                                !item.is_directory && mode() === "files" && isAllowed && selectedSet().has(item.path),

                                            // Normal file/directory
                                            "hover:bg-gray-50/50 border border-transparent hover:border-gray-200 text-gray-700":
                                                (item.is_directory || (!selectedSet().has(item.path) && isAllowed))
                                                && !(mode() === "folder" && !item.is_directory),

                                            // Disabled due to extension
                                            "opacity-40 cursor-not-allowed bg-gray-50/50 border-transparent text-gray-400":
                                                !item.is_directory && mode() === "files" && !isAllowed,

                                            // Disabled in folder mode
                                            "opacity-40 cursor-default bg-gray-50/50 border-transparent text-gray-400":
                                                !item.is_directory && mode() === "folder",
                                        }}
                                        onClick={(e) => handleItemClick(item, e)}
                                        disabled={!item.is_directory && (!isAllowed || mode() === "folder")}
                                    >
                                        <span class={`text-xl ${item.is_directory ? 'text-yellow-400' : (isAllowed ? (isSelected ? 'text-white' : 'text-gray-400') : 'text-gray-300')}`}>
                                            {item.is_directory ? "📁" : "📄"}
                                        </span>
                                        <span class={`flex-1 ${selectedSet().has(item.path) && mode() === 'files' ? 'font-medium text-white' : 'text-gray-700'}`}>
                                            {item.name}
                                        </span>
                                        {item.is_directory && <span class="text-gray-300 group-hover:text-indigo-400">→</span>}
                                        {isSelected && mode() === 'files' && <span class="text-white">✓</span>}
                                    </button>
                                );
                            }}
                        </For>

                        <Show when={items().length === 0 && !error()}>
                            <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                                <p>No subfolders</p>
                                <Show when={mode() === "folder"}>
                                    <p class="text-xs text-gray-400 mt-1">You can still select this folder to save your images here</p>
                                </Show>
                            </div>
                        </Show>
                    </Show>
                </div>

                <div class="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between rounded-b-xl">
                    <div class="text-sm text-gray-500 truncate max-w-[50%]">
                        <Show when={mode() === "files" && selectedPaths().length > 0}>
                            {selectedPaths().length} file(s) selected
                        </Show>
                        <Show when={mode() === "folder"}>
                            <strong>Selected:</strong> {selectedPaths()[0]}
                        </Show>
                    </div>
                    <div class="flex gap-3">
                        <button class="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors" onClick={props.onCancel}>
                            Cancel
                        </button>
                        <button
                            class="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                            onClick={handleConfirm}
                            disabled={selectedPaths().length === 0}
                        >
                            {mode() === "files" ? "Select Files" : "Select Folder"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
