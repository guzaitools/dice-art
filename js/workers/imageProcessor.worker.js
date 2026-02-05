/**
 * Image Processor Web Worker
 * Handles heavy image processing tasks off the main thread
 */

self.onmessage = function (e) {
    if (e.data.type === 'process') {
        try {
            const { imageData, gridSize, brightness, contrast, showGrayscale } = e.data.payload;
            const result = processImage(imageData, gridSize, brightness, contrast, showGrayscale);
            self.postMessage({ type: 'success', payload: result });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
    }
};

function processImage(imageData, gridSize, brightness, contrast, showGrayscale) {
    // 1. Grayscale Conversion (if needed, but we assume input is RGBA)
    // Actually, we should process the raw data.
    // Since we can't use DOM API (Canvas) in Worker, we must operate on ImageData (Uint8ClampedArray).

    // We expect imageData to be { width, height, data: Uint8ClampedArray }

    // Create a copy for processing
    const width = imageData.width;
    const height = imageData.height;

    // We need to implement adjustments manually on the array

    // Apply grayscale + Brightness/Contrast
    // We'll create two buffers: one for "preview" (visual) and one for "logic" (dice mapping)

    // LOGIC BUFFER (Always Grayscale + Adjustments)
    const logicData = new Uint8ClampedArray(imageData.data);
    applyAdjustments(logicData, brightness, contrast, true);

    // VISUAL BUFFER (Grayscale or Color + Adjustments)
    let visualData = null;
    if (showGrayscale) {
        visualData = logicData; // Same reference if grayscale
    } else {
        visualData = new Uint8ClampedArray(imageData.data);
        applyAdjustments(visualData, brightness, contrast, false);
    }

    // Pixelate/Grid Calculation
    const aspectRatio = width / height;
    let gridWidth, gridHeight;

    if (aspectRatio >= 1) {
        gridWidth = gridSize;
        gridHeight = Math.round(gridSize / aspectRatio);
    } else {
        gridHeight = gridSize;
        gridWidth = Math.round(gridSize * aspectRatio);
    }

    // Pixelate Logic Data for Dice Mapping
    const gridPixels = pixelateToGrid({ data: logicData, width, height }, gridWidth, gridHeight);
    const diceLevels = mapToDiceLevels(gridPixels);

    return {
        diceLevels,
        gridWidth,
        gridHeight,
        totalDice: gridWidth * gridHeight,
        visualData: visualData, // Send back processed pixel data for main thread to put on canvas
        width,
        height
    };
}

function applyAdjustments(data, brightness = 0, contrast = 0, flattenToGray = true) {
    const brightnessFactor = brightness;
    const contrastFactor = (contrast + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            let value = data[i + j] + brightnessFactor;
            value = ((value / 255 - 0.5) * contrastFactor + 0.5) * 255;
            data[i + j] = Math.max(0, Math.min(255, value));
        }
        if (flattenToGray) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
        // Alpha (i+3) untouched
    }
}

function pixelateToGrid(imgDataObj, gridWidth, gridHeight) {
    const { width, height, data } = imgDataObj;
    const cellWidth = width / gridWidth;
    const cellHeight = height / gridHeight;

    const gridData = new Uint8ClampedArray(gridWidth * gridHeight);

    for (let gy = 0; gy < gridHeight; gy++) {
        for (let gx = 0; gx < gridWidth; gx++) {
            const centerX = Math.floor((gx + 0.5) * cellWidth);
            const centerY = Math.floor((gy + 0.5) * cellHeight);
            const pixelIndex = (centerY * width + centerX) * 4;
            gridData[gy * gridWidth + gx] = data[pixelIndex];
        }
    }
    return gridData;
}

function mapToDiceLevels(gridData) {
    const diceLevels = new Uint8Array(gridData.length);
    for (let i = 0; i < gridData.length; i++) {
        const val = gridData[i];
        if (val >= 213) diceLevels[i] = 6;
        else if (val >= 170) diceLevels[i] = 5;
        else if (val >= 128) diceLevels[i] = 4;
        else if (val >= 85) diceLevels[i] = 3;
        else if (val >= 43) diceLevels[i] = 2;
        else diceLevels[i] = 1;
    }
    return diceLevels;
}
