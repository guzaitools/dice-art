import ImageProcessor from './js/imageProcessor.js';
import DiceRenderer from './js/diceRenderer.js';
import PDFExporter from './js/pdfExporter.js';
import Exporter3MF from './js/exporter3mf.js';

/**
 * Main Application Controller
 * Orchestrates the Dice Art application
 */

// Initialize modules
const imageProcessor = new ImageProcessor();
const diceRenderer = new DiceRenderer();
const pdfExporter = new PDFExporter();
const exporter3mf = new Exporter3MF();

// Last processing result for export
let lastResult = null;

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const examplesSection = document.getElementById('examplesSection');
const appHeader = document.getElementById('appHeader');
const uploadArea = document.getElementById('uploadArea');
const comparisonSlider = document.getElementById('comparisonSlider');
const diceStatsList = document.getElementById('diceStatsList');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const originalCanvas = document.getElementById('originalCanvas');
const diceCanvas = document.getElementById('diceCanvas');
const loadingOverlay = document.getElementById('loadingOverlay');

// Controls
const gridSizeSlider = document.getElementById('gridSize');
const gridSizeValue = document.getElementById('gridSizeValue');
const brightnessSlider = document.getElementById('brightness');
const brightnessValue = document.getElementById('brightnessValue');
const dieColorInput = document.getElementById('dieColor');
const pointColorInput = document.getElementById('pointColor');
const sourceGrayscaleToggle = document.getElementById('sourceGrayscaleToggle');
const resetBtn = document.getElementById('resetBtn');

// Info displays
const dimensionsInfo = document.getElementById('dimensionsInfo');
const totalDiceInfo = document.getElementById('totalDiceInfo');

// Application state
let currentSettings = {
  gridSize: 50,
  brightness: 0,
  contrast: 0,
  dieColor: '#000000',
  pointColor: '#ffffff',
  sourceGrayscale: true,
  diceSize: 10,
};

// Supported formats
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

// Load settings from LocalStorage
function loadSettings() {
  const saved = localStorage.getItem('diceArtSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      currentSettings = { ...currentSettings, ...parsed };
      applySettingsToUI();
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }
}

// Save settings to LocalStorage
function saveSettings() {
  localStorage.setItem('diceArtSettings', JSON.stringify(currentSettings));
}

// Apply saved settings to UI
function applySettingsToUI() {
  gridSizeSlider.value = currentSettings.gridSize;
  gridSizeValue.textContent = currentSettings.gridSize;
  brightnessSlider.value = currentSettings.brightness;
  brightnessValue.textContent = currentSettings.brightness;
  dieColorInput.value = currentSettings.dieColor;
  pointColorInput.value = currentSettings.pointColor;
  sourceGrayscaleToggle.checked = currentSettings.sourceGrayscale;
  document.getElementById('diceSizeToggle').checked = currentSettings.diceSize === 10;

  // Update color selector highlighting
  updateColorSelectors('dieColorSelectors', currentSettings.dieColor);
  updateColorSelectors('pointColorSelectors', currentSettings.pointColor);
}

function updateColorSelectors(containerId, activeColor) {
  const buttons = document.querySelectorAll(`#${containerId} button`);
  buttons.forEach((btn) => {
    if (btn.getAttribute('data-color') === activeColor) {
      btn.classList.add('ring-2', 'ring-primary');
    } else {
      btn.classList.remove('ring-2', 'ring-primary');
    }
  });
}

// Initialize the application
async function init() {
  console.log('Initializing Dice Art application...');

  try {
    await diceRenderer.loadDiceImages();
    console.log('Dice images loaded successfully');
  } catch (error) {
    console.error('Failed to load dice images:', error);
    alert('Error al cargar las imágenes de dados.');
    return;
  }

  loadSettings();
  setupEventListeners();

  // Initial color setup for renderer
  diceRenderer.generateTintedDice(currentSettings.dieColor, currentSettings.pointColor);
}

// Set up all event listeners
function setupEventListeners() {
  fileInput.addEventListener('change', handleFileSelect);

  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);

  uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });

  // Sliders & Toggles
  gridSizeSlider.addEventListener('input', (e) => {
    currentSettings.gridSize = parseInt(e.target.value);
    gridSizeValue.textContent = currentSettings.gridSize;
    debounceProcess();
  });

  brightnessSlider.addEventListener('input', (e) => {
    currentSettings.brightness = parseInt(e.target.value);
    brightnessValue.textContent = currentSettings.brightness;
    debounceProcess();
  });

  dieColorInput.addEventListener('input', (e) => {
    currentSettings.dieColor = e.target.value;
    document.getElementById('dieColorPlaceholder').style.backgroundColor = e.target.value;
    diceRenderer.generateTintedDice(currentSettings.dieColor, currentSettings.pointColor);
    debounceProcess();
  });

  pointColorInput.addEventListener('input', (e) => {
    currentSettings.pointColor = e.target.value;
    document.getElementById('pointColorPlaceholder').style.backgroundColor = e.target.value;
    diceRenderer.generateTintedDice(currentSettings.dieColor, currentSettings.pointColor);
    debounceProcess();
  });

  sourceGrayscaleToggle.addEventListener('change', (e) => {
    currentSettings.sourceGrayscale = e.target.checked;
    processAndRender();
    saveSettings();
  });

  const diceSizeToggle = document.getElementById('diceSizeToggle');
  diceSizeToggle.addEventListener('change', (e) => {
    currentSettings.diceSize = e.target.checked ? 10 : 5;
    processAndRender();
    saveSettings();
  });

  // Color Selector Listeners
  setupColorSelector('dieColorSelectors', 'dieColor');
  setupColorSelector('pointColorSelectors', 'pointColor');

  resetBtn.addEventListener('click', handleReset);

  // Comparison Slider
  comparisonSlider.addEventListener('input', (e) => {
    const percent = e.target.value;
    const diceWrapper = document.querySelector('.dice-wrapper');
    diceWrapper.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    document.querySelector('.comparison-line').style.left = percent + '%';
    document.querySelector('.comparison-handle').style.left = percent + '%';
  });
}

// Handle file selection
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (validateFile(file)) {
    await processUploadedImage(file);
  }
}

function validateFile(file) {
  if (!file) return false;
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    alert('Formato no soportado. Por favor usa PNG, JPG o WEBP.');
    return false;
  }
  return true;
}

// Drag and drop handlers
function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add('border-primary/50', 'bg-white/[0.05]');
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove('border-primary/50', 'bg-white/[0.05]');
}

async function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove('border-primary/50', 'bg-white/[0.05]');
  const file = event.dataTransfer.files[0];
  if (validateFile(file)) {
    await processUploadedImage(file);
  }
}

// Process uploaded image
async function processUploadedImage(file) {
  try {
    await imageProcessor.loadImage(file);
    appHeader.classList.add('scale-75', 'opacity-50');
    uploadSection.classList.add('hidden');
    examplesSection.classList.add('hidden');
    processingSection.classList.remove('hidden');
    await processAndRender();
  } catch (error) {
    console.error('Error processing image:', error);
    alert('Error al procesar la imagen.');
  }
}

// Process image and render dice art
async function processAndRender() {
  loadingOverlay.classList.remove('hidden');
  try {
    const result = imageProcessor.processImage(
      originalCanvas,
      currentSettings.gridSize,
      currentSettings.brightness,
      currentSettings.contrast,
      currentSettings.sourceGrayscale
    );

    lastResult = result; // Store for export

    dimensionsInfo.textContent = `${result.gridWidth} columnas × ${result.gridHeight} filas`;
    totalDiceInfo.textContent = result.totalDice.toLocaleString();

    await diceRenderer.renderDiceGridAnimated(
      diceCanvas,
      result.diceLevels,
      result.gridWidth,
      result.gridHeight
    );

    updateDiceStats(result.diceLevels);
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    loadingOverlay.classList.add('hidden');
  }
}

// PDF Export Handler
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const download3mfBtn = document.getElementById('download3mfBtn');
const export3dPrintBtn = document.getElementById('export3dPrintBtn');

function setupColorSelector(containerId, settingKey) {
  const buttons = document.querySelectorAll(`#${containerId} button`);
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      currentSettings[settingKey] = color;
      document.getElementById(settingKey).value = color;

      // Update UI highlighting
      updateColorSelectors(containerId, color);

      // Regenerate dice if needed
      diceRenderer.generateTintedDice(currentSettings.dieColor, currentSettings.pointColor);
      debounceProcess();
    });
  });
}

downloadPdfBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  downloadPdfBtn.disabled = true;
  const originalText = downloadPdfBtn.innerHTML;
  downloadPdfBtn.innerHTML =
    '<span class="material-symbols-outlined animate-spin text-lg">sync</span><span class="text-[10px] font-bold pr-1">PDF</span>';

  try {
    const stats = diceRenderer.getDiceStats(lastResult.diceLevels);
    const metadata = {
      gridWidth: lastResult.gridWidth,
      gridHeight: lastResult.gridHeight,
      totalDice: lastResult.totalDice,
      stats: stats,
      colors: {
        dieColor: currentSettings.dieColor,
        pointColor: currentSettings.pointColor,
      },
    };

    await pdfExporter.exportProject(diceCanvas, originalCanvas, metadata);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Error generating PDF. Please try again.');
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = originalText;
  }
});

// 3MF Export Handler
download3mfBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  download3mfBtn.disabled = true;
  const originalHtml = download3mfBtn.innerHTML;
  download3mfBtn.innerHTML =
    '<i data-lucide="sync" class="w-4 h-4 animate-spin"></i><span class="text-[10px] font-bold pr-1">3MF</span>';
  lucide.createIcons();

  try {
    // Prototyping step 1: Prove project dice can be assembled
    const blob = await exporter3mf.generate3MF(
      lastResult.diceLevels,
      lastResult.gridWidth,
      lastResult.gridHeight
    );
    exporter3mf.saveFile(blob, 'dice-art-project-multiplate.3mf');
  } catch (error) {
    console.error('Error exporting 3MF:', error);
    alert('Error generating 3MF. This is a prototype.');
  } finally {
    download3mfBtn.disabled = false;
    download3mfBtn.innerHTML = originalHtml;
    lucide.createIcons();
  }
});

// New Single Plate 3D Print Export
export3dPrintBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  export3dPrintBtn.disabled = true;
  const originalHtml = export3dPrintBtn.innerHTML;
  export3dPrintBtn.innerHTML =
    '<i data-lucide="sync" class="w-4 h-4 animate-spin"></i><span class="text-[10px] font-bold pr-1">PRINTING</span>';
  lucide.createIcons();

  try {
    const blob = await exporter3mf.generateSinglePlate3MF(
      lastResult.diceLevels,
      lastResult.gridWidth,
      lastResult.gridHeight,
      currentSettings.diceSize
    );
    exporter3mf.saveFile(blob, `dice-art-print-${currentSettings.diceSize}mm.3mf`);
  } catch (error) {
    console.error('Error exporting 3D Print:', error);
    alert('Error generating 3D Print 3MF.');
  } finally {
    export3dPrintBtn.disabled = false;
    export3dPrintBtn.innerHTML = originalHtml;
    lucide.createIcons();
  }
});

// Update dice statistics
function updateDiceStats(diceLevels) {
  const stats = diceRenderer.getDiceStats(diceLevels);
  diceStatsList.innerHTML = '';

  stats.byLevel.forEach((count, index) => {
    const face = index + 1;
    const item = document.createElement('div');
    item.className =
      'flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md';

    // Calculate appropriate filter for dice icons
    // Since original icons are black dice with white dots,
    // and we want them to look like the tinted ones roughly
    const filter = currentSettings.dieColor === '#ffffff' ? 'none' : 'invert(1) brightness(0.8)';

    item.innerHTML = `
            <img src="assets/dice/dice-${face}.png" class="w-5 h-5 rounded-sm opacity-90 shadow-sm" style="filter: ${filter}; background-color: ${currentSettings.dieColor}">
            <span class="text-white font-mono text-[11px] font-bold">${count.toLocaleString()}</span>
        `;
    diceStatsList.appendChild(item);
  });
}

// Handle reset
function handleReset() {
  currentSettings = {
    gridSize: 50,
    brightness: 0,
    contrast: 0,
    dieColor: '#000000',
    pointColor: '#ffffff',
    sourceGrayscale: true,
    diceSize: 10,
  };
  applySettingsToUI();
  diceRenderer.generateTintedDice(currentSettings.dieColor, currentSettings.pointColor);
  processAndRender();
  saveSettings();
}

// Debounced processing
let processTimeout;
function debounceProcess() {
  clearTimeout(processTimeout);
  processTimeout = setTimeout(() => {
    processAndRender();
    saveSettings();
  }, 300);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
