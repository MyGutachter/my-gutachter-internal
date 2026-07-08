import { renderToString } from 'react-dom/server';
import { CarOverlay } from '../components/ui/CarOverlay';

export const getCarSvgHtml = (selectedParts: string[]): string => {
    // We render the CarOverlay component to a static HTML string.

    const svgComponent = (
        <CarOverlay
            selectedParts={selectedParts}
            onPartSelected={() => { }}
            savedScreenshots={{}}
            onViewScreenshot={() => { }}
            hideSelectedList
            readOnly
            svgContainerStyle={{ width: '100%', height: '100%' }}
        />
    );

    try {
        return renderToString(svgComponent);
    } catch (e) {
        console.error("Failed to render Car SVG to string", e);
        return '<div style="color:red;border:1px dashed #ccc;padding:20px;text-align:center;margin:12px 0;min-height:120px;font-size:9pt">Error generating diagram</div>';
    }
};
