/**
 * Image Processor Module
 * Handles image loading, grayscale conversion, and image adjustments
 */

class ImageProcessor {
    constructor() {
        this.originalImage = null;
        this.processedImageData = null;
    }

    /**
     * Load an image from a file
     * @param {File} file - The image file to load
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.originalImage = img;
                    resolve(img);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert image to grayscale
     * @param {HTMLCanvasElement} canvas - Canvas to draw on
     * @param {HTMLImageElement} image - Source image
     * @returns {ImageData} Grayscale image data
     */
    convertToGrayscale(canvas, image) {
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;

        // Draw original image
        ctx.drawImage(image, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale using luminosity method
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Alpha channel (i + 3) remains unchanged
        }

        return imageData;
    }

    /**
     * Apply brightness and contrast adjustments
     * @param {ImageData} imageData - Image data to adjust
     * @param {number} brightness - Brightness adjustment (-100 to 100)
     * @param {number} contrast - Contrast adjustment (-100 to 100)
     * @returns {ImageData} Adjusted image data
     */
    applyAdjustments(imageData, brightness = 0, contrast = 0, flattenToGray = true) {
        const data = imageData.data;
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
        }
        return imageData;
    }

    /**
     * Reduce image to grid size (pixelation)
     * @param {ImageData} imageData - Source image data
     * @param {number} gridWidth - Target grid width
     * @param {number} gridHeight - Target grid height
     * @returns {Uint8ClampedArray} Array of grayscale values for each grid cell
     */
    pixelateToGrid(imageData, gridWidth, gridHeight) {
        const { width, height, data } = imageData;
        const cellWidth = width / gridWidth;
        const cellHeight = height / gridHeight;

        const gridData = new Uint8ClampedArray(gridWidth * gridHeight);

        // Sample each grid cell
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                // Calculate the center of this grid cell
                const centerX = Math.floor((gx + 0.5) * cellWidth);
                const centerY = Math.floor((gy + 0.5) * cellHeight);

                // Get the pixel index
                const pixelIndex = (centerY * width + centerX) * 4;

                // Store grayscale value (R channel, since it's already grayscale)
                gridData[gy * gridWidth + gx] = data[pixelIndex];
            }
        }

        return gridData;
    }

    /**
     * Map grayscale values to dice levels (1-6)
     * Level 1 (213-255) -> Lightest (Dice 1)
     * Level 2 (170-212) -> Dice 2
     * Level 3 (128-169) -> Dice 3
     * Level 4 (85-127)  -> Dice 4
     * Level 5 (43-84)   -> Dice 5
     * Level 6 (0-42)    -> Darkest (Dice 6)
     * 
     * @param {Uint8ClampedArray} gridData - Grayscale values
     * @returns {Uint8Array} Dice levels (1-6)
     */
    mapToDiceLevels(gridData) {
        const diceLevels = new Uint8Array(gridData.length);

        for (let i = 0; i < gridData.length; i++) {
            const grayValue = gridData[i];

            if (grayValue >= 213) {
                diceLevels[i] = 6; // Lightest (6 points)
            } else if (grayValue >= 170) {
                diceLevels[i] = 5;
            } else if (grayValue >= 128) {
                diceLevels[i] = 4;
            } else if (grayValue >= 85) {
                diceLevels[i] = 3;
            } else if (grayValue >= 43) {
                diceLevels[i] = 2;
            } else {
                diceLevels[i] = 1; // Darkest (1 point)
            }
        }

        return diceLevels;
    }

    /**
     * Process the entire pipeline
     * @param {HTMLCanvasElement} canvas - Canvas for processing
     * @param {number} gridSize - Grid dimensions (square)
     * @param {number} brightness - Brightness adjustment
     * @param {number} contrast - Contrast adjustment
     * @returns {Object} Processing result with dice levels and dimensions
     */
    processImage(canvas, gridSize, brightness = 0, contrast = 0, showGrayscale = true) {
        if (!this.originalImage) throw new Error('No image loaded');

        // Always work with grayscale data for dice mapping
        let tempCanvas = document.createElement('canvas');
        let grayscaleData = this.convertToGrayscale(tempCanvas, this.originalImage);
        grayscaleData = this.applyAdjustments(grayscaleData, brightness, contrast);

        // Put the requested preview version on the visual canvas
        const ctx = canvas.getContext('2d');
        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;

        if (showGrayscale) {
            ctx.putImageData(grayscaleData, 0, 0);
        } else {
            // Draw color version but with same adjustments
            ctx.drawImage(this.originalImage, 0, 0);
            let colorData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            colorData = this.applyAdjustments(colorData, brightness, contrast, false); // Adjustments without luminosity conversion
            ctx.putImageData(colorData, 0, 0);
        }

        // Step 3: Calculate grid dimensions maintaining aspect ratio
        const aspectRatio = this.originalImage.width / this.originalImage.height;
        let gridWidth, gridHeight;

        if (aspectRatio >= 1) {
            // Landscape or square
            gridWidth = gridSize;
            gridHeight = Math.round(gridSize / aspectRatio);
        } else {
            // Portrait
            gridHeight = gridSize;
            gridWidth = Math.round(gridSize * aspectRatio);
        }

        // Step 4: Pixelate to grid
        const gridData = this.pixelateToGrid(grayscaleData, gridWidth, gridHeight);

        // Step 5: Map to dice levels
        const diceLevels = this.mapToDiceLevels(gridData);

        return {
            diceLevels,
            gridWidth,
            gridHeight,
            totalDice: gridWidth * gridHeight
        };
    }

    /**
     * Get original image dimensions
     * @returns {Object} Width and height
     */
    getOriginalDimensions() {
        if (!this.originalImage) {
            return { width: 0, height: 0 };
        }
        return {
            width: this.originalImage.width,
            height: this.originalImage.height
        };
    }
}

// Export for use in main app
window.ImageProcessor = ImageProcessor;
