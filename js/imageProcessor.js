/**
 * Image Processor Module
 * Handles image loading, gray scale conversion, pixelation, and mapping to dice levels.
 * It serves as the core pipeline for transforming raw images into dice art configurations.
 */
export default class ImageProcessor {
  /**
   * Initializes a new ImageProcessor instance.
   */
  constructor() {
    /** @type {HTMLImageElement|null} The originally loaded image */
    this.originalImage = null;
    /** @type {ImageData|null} The processed image data */
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
      data[i] = gray; // R
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
   * Initialize worker
   */
  initWorker() {
    if (window.Worker) {
      this.worker = new Worker(new URL('./workers/imageProcessor.worker.js', import.meta.url), { type: 'module' });
    }
  }

  /**
   * Process the entire pipeline (using Web Worker)
   * @param {HTMLCanvasElement} canvas - Canvas for processing
   * @param {number} gridSize - Grid dimensions (square)
   * @param {number} brightness - Brightness adjustment
   * @param {number} contrast - Contrast adjustment
   * @returns {Promise<Object>} Processing result with dice levels and dimensions
   */
  processImage(canvas, gridSize, brightness = 0, contrast = 0, showGrayscale = true, invertOrder = false) {
    if (!this.originalImage) throw new Error('No image loaded');

    // If no worker (fallback or not init), init it
    if (!this.worker) this.initWorker();

    return new Promise((resolve, reject) => {
      // Get raw image data to send to worker
      // We need an intermediate canvas to extract pixel data from the image element
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.originalImage.width;
      tempCanvas.height = this.originalImage.height;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0);
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

      // Define message handler
      const handler = (e) => {
        if (e.data.type === 'success') {
          const result = e.data.payload;

          // Update the visual canvas
          canvas.width = result.width;
          canvas.height = result.height;
          const visualCtx = canvas.getContext('2d');
          // Create ImageData from the array buffer
          const visualImageData = new ImageData(result.visualData, result.width, result.height);
          visualCtx.putImageData(visualImageData, 0, 0);

          this.worker.removeEventListener('message', handler);
          resolve({
            diceLevels: result.diceLevels,
            gridWidth: result.gridWidth,
            gridHeight: result.gridHeight,
            totalDice: result.totalDice
          });
        } else if (e.data.type === 'error') {
          this.worker.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };

      this.worker.addEventListener('message', handler);

      // Use Transferable objects for performance (don't copy the buffer)
      const buffer = imageData.data.buffer;

      this.worker.postMessage({
        type: 'process',
        payload: {
          imageData: {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data
          },
          gridSize,
          brightness,
          contrast,
          showGrayscale,
          invertOrder
        }
      }, [buffer]);
    });
  }

  terminate() {
    if (this.worker) this.worker.terminate();
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
      height: this.originalImage.height,
    };
  }
}

// Export for use in main app
window.ImageProcessor = ImageProcessor;
