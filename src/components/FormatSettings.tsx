import { createSignal, Show } from "solid-js";

export type OutputFormat = "keeporiginal" | "png" | "jpeg" | "webp";

interface FormatSettingsProps {
    onFormatChange: (format: OutputFormat, quality: number) => void;
}

export function FormatSettings(props: FormatSettingsProps) {
    const [selectedFormat, setSelectedFormat] = createSignal<OutputFormat>("keeporiginal");
    const [quality, setQuality] = createSignal(75);

    const handleFormatChange = (format: OutputFormat) => {
        setSelectedFormat(format);
        props.onFormatChange(format, quality());
    };

    const handleQualityChange = (newQuality: number) => {
        setQuality(newQuality);
        props.onFormatChange(selectedFormat(), newQuality);
    };

    const showQualitySlider = () => {
        const format = selectedFormat();
        return format === "jpeg" || format === "webp";
    };

    const getQualityLabel = () => {
        const q = quality();
        if (q >= 90) return "Excellent";
        if (q >= 75) return "High (Recommended)";
        if (q >= 50) return "Medium";
        return "Low";
    };

    return (
        <div class="mt-6 p-6 bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-xl border border-emerald-500/20">
            <h4 class="text-lg font-semibold text-emerald-400 mb-4">Output Format & Quality</h4>

            <div class="flex items-center gap-4 mb-4">
                <label for="format-select" class="font-medium min-w-[60px]">Format:</label>
                <select
                    id="format-select"
                    value={selectedFormat()}
                    onChange={(e) => handleFormatChange(e.currentTarget.value as OutputFormat)}
                    class="flex-1 px-3 py-2 bg-white border border-emerald-500/30 rounded-lg text-gray-900 cursor-pointer transition-all hover:border-emerald-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                    <option value="keeporiginal">Keep Original</option>
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Lossy)</option>
                    <option value="webp">WebP (Modern, Best Compression)</option>
                </select>
            </div>

            <Show when={showQualitySlider()}>
                <div class="my-6 p-4 bg-white/50 rounded-lg">
                    <label class="block font-medium mb-3 text-green-700">
                        Quality: {quality()} - {getQualityLabel()}
                    </label>
                    <input
                        id="quality-range"
                        type="range"
                        min="1"
                        max="100"
                        value={quality()}
                        onInput={(e) => handleQualityChange(parseInt(e.currentTarget.value))}
                        class="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-600 rounded appearance-none cursor-pointer 
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-3 
                   [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:shadow-lg 
                   [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
                   [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full 
                   [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-3 [&::-moz-range-thumb]:border-emerald-500 
                   [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                    />
                    <div class="flex justify-between mt-2 text-xs text-gray-500">
                        <span>1</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                    </div>
                </div>
            </Show>

            <div class="mt-4 p-4 bg-white/70 rounded-lg text-sm leading-relaxed">
                <Show when={selectedFormat() === "keeporiginal"}>
                    <p class="text-gray-700">📄 Keeps the original format (PNG, JPEG, etc.)</p>
                </Show>
                <Show when={selectedFormat() === "png"}>
                    <p class="text-gray-700">🖼️ PNG: Lossless compression, best for graphics and screenshots</p>
                </Show>
                <Show when={selectedFormat() === "jpeg"}>
                    <p class="text-gray-700">📸 JPEG: Lossy compression, best for photos. Adjust quality to balance size vs. quality.</p>
                </Show>
                <Show when={selectedFormat() === "webp"}>
                    <div class="text-gray-700">
                        <p class="mb-2">✨ WebP: Modern format with superior compression</p>
                        <ul class="list-disc pl-6 space-y-1">
                            <li><strong class="text-green-700 font-semibold">Quality 100:</strong> Lossless mode (25-35% smaller than PNG)</li>
                            <li><strong class="text-green-700 font-semibold">Quality 75-99:</strong> High quality lossy (much smaller than JPEG)</li>
                            <li><strong class="text-green-700 font-semibold">Quality &lt;75:</strong> Maximum compression</li>
                        </ul>
                    </div>
                </Show>
            </div>
        </div>
    );
}
