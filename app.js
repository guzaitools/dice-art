import ImageProcessor from './js/imageProcessor.js';
import DiceRenderer from './js/diceRenderer.js';
import PDFExporter from './js/pdfExporter.js';
import Exporter3MF from './js/exporter3mf.js';
import ExporterSCAD from './js/scadExporter.js';
import ExporterSCAD from './js/scadExporter.js';

/**
 * Main Application Controller
 * Orchestrates the Dice Art application
 */

// Initialize modules
const imageProcessor = new ImageProcessor();
const diceRenderer = new DiceRenderer();
const pdfExporter = new PDFExporter();
const exporter3mf = new Exporter3MF();
const scadExporter = new ExporterSCAD();

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
const exportMultiPlateBtn = document.getElementById('exportMultiPlateBtn');
const export3dPrintBtn = document.getElementById('export3dPrintBtn');
const downloadScadBtn = document.getElementById('downloadScadBtn');

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

    const blob = await pdfExporter.exportProject(diceCanvas, originalCanvas, metadata);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dice-art-project-instructions.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Error generating PDF. Please try again.');
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = originalText;
  }
});

// Multi-Plate 3MF Export Handler (10x10 Modules)
exportMultiPlateBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  exportMultiPlateBtn.disabled = true;
  const originalHtml = exportMultiPlateBtn.innerHTML;
  exportMultiPlateBtn.innerHTML = '<i data-lucide="sync" class="w-4 h-4 animate-spin"></i><span class="text-[10px] font-bold pr-1">GROUPING...</span>';
  lucide.createIcons();

  try {
    const blob = await exporter3mf.generateMultiPlate3MF(
      lastResult.diceLevels,
      lastResult.gridWidth,
      lastResult.gridHeight,
      currentSettings.diceSize
    );
    exporter3mf.saveFile(blob, `dice-art-multi-plate-10x10-${currentSettings.diceSize}mm.3mf`);
  } catch (error) {
    console.error('Error exporting Multi-Plate:', error);
    alert('Error generating Grouped Multi-Plate export.');
  } finally {
    exportMultiPlateBtn.disabled = false;
    exportMultiPlateBtn.innerHTML = originalHtml;
    lucide.createIcons();
  }
});

// New Single Plate 3D Print Export (Now opens modal)
const exportModal = document.getElementById('exportModal');
const modalOverlay = document.getElementById('modalOverlay');
const cancelExportBtn = document.getElementById('cancelExportBtn');
const confirmExportBtn = document.getElementById('confirmExportBtn');

export3dPrintBtn.addEventListener('click', () => {
  if (!lastResult) return;
  exportModal.classList.remove('hidden');
});

const closeModal = () => {
  exportModal.classList.add('hidden');
};

cancelExportBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

confirmExportBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  const options = {
    primeTower: document.getElementById('modalPrimeTower').checked,
    raft: document.getElementById('modalRaft').checked,
    spacing: document.getElementById('modalSpacing').checked
  };

  // UI Feedback in Modal
  confirmExportBtn.disabled = true;
  cancelExportBtn.disabled = true;
  const btnText = document.getElementById('exportBtnText');
  const spinner = document.getElementById('exportSpinner');
  const originalBtnText = btnText.textContent;
  btnText.textContent = 'Processing...';
  spinner.classList.remove('hidden');

  try {
    const threeMfBlob = await exporter3mf.generateSinglePlate3MF(
      lastResult.diceLevels,
      lastResult.gridWidth,
      lastResult.gridHeight,
      currentSettings.diceSize,
      options
    );

    const includePdf = document.getElementById('modalIncludePdf').checked;
    if (includePdf) {
      console.log("Bundling PDF instructions in ZIP...");
      const stats = diceRenderer.getDiceStats(lastResult.diceLevels);
      const metadata = {
        gridWidth: lastResult.gridWidth,
        gridHeight: lastResult.gridHeight,
        totalDice: lastResult.totalDice,
        stats: stats,
        colors: { dieColor: currentSettings.dieColor, pointColor: currentSettings.pointColor }
      };
      const pdfBlob = await pdfExporter.exportProject(diceCanvas, originalCanvas, metadata);

      const zip = new JSZip();
      zip.file(`print-model-${currentSettings.diceSize}mm.3mf`, threeMfBlob);
      zip.file('assembly-instructions.pdf', pdfBlob);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      exporter3mf.saveFile(zipBlob, `dice-art-bundle-${currentSettings.diceSize}mm.zip`);
    } else {
      exporter3mf.saveFile(threeMfBlob, `dice-art-print-${currentSettings.diceSize}mm.3mf`);
    }
  } catch (error) {
    console.error('Error exporting 3D Print:', error);
    alert('Error generating 3D Print 3MF.');
  } finally {
    // Reset and Close Modal
    confirmExportBtn.disabled = false;
    cancelExportBtn.disabled = false;
    btnText.textContent = originalBtnText;
    spinner.classList.add('hidden');
    closeModal();
  }
});

// OpenSCAD Export Handler
downloadScadBtn.addEventListener('click', async () => {
  if (!lastResult) return;

  downloadScadBtn.disabled = true;
  const originalHtml = downloadScadBtn.innerHTML;
  downloadScadBtn.innerHTML =
    '<i data-lucide="sync" class="w-4 h-4 animate-spin"></i><span class="text-[10px] font-bold pr-1">SCAD</span>';
  lucide.createIcons();

  try {
    const scadContent = scadExporter.generateSCAD(
      lastResult.diceLevels,
      lastResult.gridWidth,
      lastResult.gridHeight,
      currentSettings.diceSize
    );
    scadExporter.saveFile(scadContent, `dice-art-${currentSettings.diceSize}mm.scad`);
  } catch (error) {
    console.error('Error exporting SCAD:', error);
    alert('Error generating OpenSCAD script.');
  } finally {
    downloadScadBtn.disabled = false;
    downloadScadBtn.innerHTML = originalHtml;
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
