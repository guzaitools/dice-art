export default class DiceRenderer {
  constructor() {
    this.masterDiceImages = [];
    this.tintedDiceCanvases = [];
    this.imagesLoaded = false;
    this.currentColors = {
      dieColor: '#000000',
      pointColor: '#ffffff',
    };
  }

  /**
   * Load all 6 dice face images as master templates
   * @returns {Promise<void>}
   */
  async loadDiceImages() {
    const loadPromises = [];

    for (let i = 1; i <= 6; i++) {
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.masterDiceImages[i - 1] = img;
          resolve();
        };
        img.onerror = () => {
          reject(new Error(`Failed to load dice-${i}.png`));
        };
        img.src = `assets/dice/dice-${i}.png`;
      });
      loadPromises.push(promise);
    }

    try {
      await Promise.all(loadPromises);
      this.imagesLoaded = true;
      console.log('Master dice images loaded successfully');
      // Initial tinting (default black/white)
      this.generateTintedDice('#000000', '#ffffff');
    } catch (error) {
      console.error('Error loading dice images:', error);
      throw error;
    }
  }

  /**
   * Pre-render tinted dice faces into offscreen canvases
   * @param {string} dieColor - Hex color for the dice body
   * @param {string} pointColor - Hex color for the dice points
   */
  generateTintedDice(dieColor, pointColor) {
    this.currentColors = { dieColor, pointColor };
    this.tintedDiceCanvases = this.masterDiceImages.map((img) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      // 1. Draw Background (Die Body)
      ctx.fillStyle = dieColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Die Mask and swap colors at pixel level
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Binary swap: pixels closer to white get pointColor, others stay dieColor
      // Current dice are white dots on black bg
      const p = this._hexToRgb(pointColor);
      const b = this._hexToRgb(dieColor);

      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg > 128) {
          data[i] = p.r;
          data[i + 1] = p.g;
          data[i + 2] = p.b;
          data[i + 3] = 255; // Keep points opaque
        } else {
          data[i] = b.r;
          data[i + 1] = b.g;
          data[i + 2] = b.b;
          data[i + 3] = 255; // Body opaque
        }
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    });
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Render the dice art grid on canvas using tinted images
   */
  renderDiceGrid(canvas, diceLevels, gridWidth, gridHeight, maxCanvasSize = 1200) {
    if (!this.imagesLoaded) throw new Error('Dice images not loaded');
    const ctx = canvas.getContext('2d');
    const maxDiceSize = Math.floor(maxCanvasSize / Math.max(gridWidth, gridHeight));
    const diceSize = Math.max(8, Math.min(maxDiceSize, 50));

    canvas.width = gridWidth * diceSize;
    canvas.height = gridHeight * diceSize;

    // Background matches the die color for seamless look between gaps
    ctx.fillStyle = this.currentColors.dieColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;
        const diceLevel = diceLevels[index];
        const diceImage = this.tintedDiceCanvases[diceLevel - 1];

        if (diceImage) {
          ctx.drawImage(diceImage, x * diceSize, y * diceSize, diceSize, diceSize);
        }
      }
    }
  }

  /**
   * Render with animation using tinted images
   */
  async renderDiceGridAnimated(canvas, diceLevels, gridWidth, gridHeight, onProgress = null) {
    if (!this.imagesLoaded) throw new Error('Dice images not loaded');
    const ctx = canvas.getContext('2d');
    const maxCanvasSize = 1200;
    const maxDiceSize = Math.floor(maxCanvasSize / Math.max(gridWidth, gridHeight));
    const diceSize = Math.max(8, Math.min(maxDiceSize, 50));

    canvas.width = gridWidth * diceSize;
    canvas.height = gridHeight * diceSize;

    ctx.fillStyle = this.currentColors.dieColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const chunkSize = 500;
    const totalDice = gridWidth * gridHeight;

    for (let startIndex = 0; startIndex < totalDice; startIndex += chunkSize) {
      const endIndex = Math.min(startIndex + chunkSize, totalDice);
      for (let i = startIndex; i < endIndex; i++) {
        const x = i % gridWidth;
        const y = Math.floor(i / gridWidth);
        const diceLevel = diceLevels[i];
        const diceImage = this.tintedDiceCanvases[diceLevel - 1];

        if (diceImage) {
          ctx.drawImage(diceImage, x * diceSize, y * diceSize, diceSize, diceSize);
        }
      }
      if (onProgress) onProgress(Math.round((endIndex / totalDice) * 100));
      if (endIndex < totalDice) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  getDiceStats(diceLevels) {
    const stats = { total: diceLevels.length, byLevel: [0, 0, 0, 0, 0, 0] };
    for (let i = 0; i < diceLevels.length; i++) {
      const level = diceLevels[i];
      stats.byLevel[level - 1]++;
    }
    return stats;
  }
}
