import { createSignal, createEffect, For } from "solid-js";
import { info } from "@tauri-apps/plugin-log";

interface DimensionsProps {
    originalWidth: number;
    originalHeight: number;
    onDimensionsChange: (width: number, height: number) => void;
}

export function Dimensions(props: DimensionsProps) {
    const [width, setWidth] = createSignal(props.originalWidth);
    const [height, setHeight] = createSignal(props.originalHeight);
    const [aspectRatioLocked, setAspectRatioLocked] = createSignal(true);
    const [selectedPercentage, setSelectedPercentage] = createSignal(100);

    const aspectRatio = props.originalWidth / props.originalHeight;

    createEffect(() => {
        info("Selected percentage changed:" + selectedPercentage());
    });

    createEffect(() => {
        info("Width changed:" + width());
    });

    createEffect(() => {
        info("Height changed:" + height());
    });

    createEffect(() => {
        props.onDimensionsChange(width(), height());
    });

    const handleWidthChange = (value: number) => {
        setWidth(value);
        if (aspectRatioLocked()) {
            setHeight(Math.round(value / aspectRatio));
        }
        setSelectedPercentage(0);
    };

    const handleHeightChange = (value: number) => {
        setHeight(value);
        if (aspectRatioLocked()) {
            setWidth(Math.round(value * aspectRatio));
        }
        setSelectedPercentage(0);
    };

    const handlePercentageChange = (percentage: number) => {
        setSelectedPercentage(percentage);
        const newWidth = Math.round((props.originalWidth * percentage) / 100);
        const newHeight = Math.round((props.originalHeight * percentage) / 100);
        setWidth(newWidth);
        setHeight(newHeight);
    };

    const toggleAspectRatio = () => {
        setAspectRatioLocked(!aspectRatioLocked());
    };

    const percentages = [100, 75, 50, 25];

    return (
        <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 class="text-lg font-semibold mb-4">Dimensions</h3>

            <div class="flex items-center gap-3 mb-4">
                <div class="flex-1">
                    <label for="width" class="block text-sm mb-1 text-white/70">Width</label>
                    <div class="relative">
                        <input
                            id="width"
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
                    <label for="height" class="block text-sm mb-1 text-white/70">Height</label>
                    <div class="relative">
                        <input
                            id="height"
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

            <div class="mb-4">
                <label class="block text-sm mb-2 text-white/70">Scale by percentage</label>
                <div class="flex gap-2">
                    <For each={percentages}>
                        {(percentage) => (
                            <button
                                onClick={() => handlePercentageChange(percentage)}
                                class={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${selectedPercentage() === percentage
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                {percentage}%
                            </button>
                        )}
                    </For>
                </div>
            </div>

            <div class="flex justify-between text-sm pt-3 border-t border-white/10">
                <div>
                    <span class="text-white/50">Original:</span>
                    <span class="ml-2 text-white font-mono">
                        {props.originalWidth} × {props.originalHeight}
                    </span>
                </div>
                <div>
                    <span class="text-white/50">Target:</span>
                    <span class="ml-2 text-indigo-400 font-mono font-semibold">
                        {width()} × {height()}
                    </span>
                </div>
            </div>
        </div>
    );
}
