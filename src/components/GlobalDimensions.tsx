import { createSignal, createEffect, For } from "solid-js";

export type ResizeMode = "absolute" | "percentage";

interface GlobalDimensionsProps {
    onGlobalChange: (mode: ResizeMode, width?: number, height?: number, percentage?: number) => void;
}

export function GlobalDimensions(props: GlobalDimensionsProps) {
    const [mode, setMode] = createSignal<ResizeMode>("percentage");
    const [width, setWidth] = createSignal(1920);
    const [height, setHeight] = createSignal(1080);
    const [aspectRatioLocked, setAspectRatioLocked] = createSignal(true);
    const [selectedPercentage, setSelectedPercentage] = createSignal(100);

    const aspectRatio = width() / height();

    createEffect(() => {
        if (mode() === "percentage") {
            props.onGlobalChange(mode(), undefined, undefined, selectedPercentage());
        } else {
            props.onGlobalChange(mode(), width(), height(), undefined);
        }
    });

    const handleWidthChange = (value: number) => {
        setWidth(value);
        if (aspectRatioLocked()) {
            setHeight(Math.round(value / aspectRatio));
        }
    };

    const handleHeightChange = (value: number) => {
        setHeight(value);
        if (aspectRatioLocked()) {
            setWidth(Math.round(value * aspectRatio));
        }
    };

    const handlePercentageChange = (percentage: number) => {
        setSelectedPercentage(percentage);
    };

    const toggleAspectRatio = () => {
        setAspectRatioLocked(!aspectRatioLocked());
    };

    const percentages = [100, 75, 50, 25];

    return (
        <div class="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-xl border border-indigo-500/20">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold">Apply to All Images</h3>
                <div class="flex gap-2">
                    <button
                        onClick={() => setMode("percentage")}
                        class={`px-4 py-2 rounded-lg font-medium transition-all ${mode() === "percentage"
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                    >
                        By Percentage
                    </button>
                    <button
                        onClick={() => setMode("absolute")}
                        class={`px-4 py-2 rounded-lg font-medium transition-all ${mode() === "absolute"
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                    >
                        Fixed Size
                    </button>
                </div>
            </div>

            {mode() === "percentage" ? (
                <div>
                    <label class="block text-sm mb-3 text-white/70">Scale all images by percentage</label>
                    <div class="flex gap-2 mb-4">
                        <For each={percentages}>
                            {(percentage) => (
                                <button
                                    onClick={() => handlePercentageChange(percentage)}
                                    class={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${selectedPercentage() === percentage
                                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {percentage}%
                                </button>
                            )}
                        </For>
                    </div>
                    <p class="text-sm text-white/50 italic">
                        Each image will be resized to {selectedPercentage()}% of its original dimensions
                    </p>
                </div>
            ) : (
                <div>
                    <label class="block text-sm mb-3 text-white/70">Set all images to the same size</label>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex-1">
                            <label for="global-width" class="block text-sm mb-1 text-white/70">Width</label>
                            <div class="relative">
                                <input
                                    id="global-width"
                                    type="number"
                                    value={width()}
                                    onInput={(e) => handleWidthChange(parseInt(e.currentTarget.value) || 0)}
                                    min="1"
                                    class="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">px</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleAspectRatio}
                            title={aspectRatioLocked() ? "Unlock aspect ratio" : "Lock aspect ratio"}
                            class={`mt-6 p-2 rounded-lg border transition-all ${aspectRatioLocked()
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                                    : 'bg-white/5 border-white/20 text-white/50 hover:bg-white/10'
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
                                {aspectRatioLocked() ? (
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                    />
                                ) : (
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                                    />
                                )}
                            </svg>
                        </button>

                        <div class="flex-1">
                            <label for="global-height" class="block text-sm mb-1 text-white/70">Height</label>
                            <div class="relative">
                                <input
                                    id="global-height"
                                    type="number"
                                    value={height()}
                                    onInput={(e) => handleHeightChange(parseInt(e.currentTarget.value) || 0)}
                                    min="1"
                                    class="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">px</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-white/50 italic">
                        All images will be resized to {width()} × {height()} pixels
                    </p>
                </div>
            )}
        </div>
    );
}
