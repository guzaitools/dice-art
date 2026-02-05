import AppController from './js/core/AppController.js';

/**
 * Main Application Entry Point
 * Initializes and wires the Dice Art application using AppController
 */

// Get all DOM element references
const domElements = {
  // Sections
  uploadSection: document.getElementById('uploadSection'),
  processingSection: document.getElementById('processingSection'),
  examplesSection: document.getElementById('examplesSection'),
  appHeader: document.getElementById('appHeader'),

  // Upload area
  uploadArea: document.getElementById('uploadArea'),
  uploadBtn: document.getElementById('uploadBtn'),
  fileInput: document.getElementById('fileInput'),

  // Canvases
  originalCanvas: document.getElementById('originalCanvas'),
  diceCanvas: document.getElementById('diceCanvas'),

  // UI Elements
  loadingOverlay: document.getElementById('loadingOverlay'),
  comparisonSlider: document.getElementById('comparisonSlider'),
  diceStatsList: document.getElementById('diceStatsList'),
  dimensionsInfo: document.getElementById('dimensionsInfo'),
  totalDiceInfo: document.getElementById('totalDiceInfo'),

  // Controls
  gridSizeSlider: document.getElementById('gridSize'),
  gridSizeValue: document.getElementById('gridSizeValue'),
  brightnessSlider: document.getElementById('brightness'),
  brightnessValue: document.getElementById('brightnessValue'),
  contrastSlider: document.getElementById('contrast'),
  contrastValue: document.getElementById('contrastValue'),
  dieColorInput: document.getElementById('dieColor'),
  pointColorInput: document.getElementById('pointColor'),
  sourceGrayscaleToggle: document.getElementById('sourceGrayscaleToggle'),
  resetBtn: document.getElementById('resetBtn'),

  // Export buttons
  downloadPdfBtn: document.getElementById('downloadPdfBtn'),
  export3dPrintBtn: document.getElementById('export3dPrintBtn'),
  exportMultiPlateBtn: document.getElementById('exportMultiPlateBtn'),
  downloadScadBtn: document.getElementById('downloadScadBtn'),
  modalDownloadPdfBtn: document.getElementById('modalDownloadPdfBtn'),

  // Modal
  exportModal: document.getElementById('exportModal'),
  modalOverlay: document.getElementById('modalOverlay'),
  cancelExportBtn: document.getElementById('cancelExportBtn'),
  confirmExportBtn: document.getElementById('confirmExportBtn'),
};

// Initialize app controller
const app = new AppController({ domElements });

// Debounce helper for performance
let debounceTimer;
function debounce(callback, delay = 300) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(callback, delay);
}

/**
 * Initialize the application
 */
async function init() {
  console.log('Initializing Dice Art application...');

  const initialized = await app.init();
  if (!initialized) {
    alert('Failed to initialize application');
    return;
  }

  setupEventListeners();
  applySettingsToUI();

  console.log('Application ready!');
}

/**
 * Apply current settings to UI elements
 */
function applySettingsToUI() {
  const settings = app.getSettings();

  // Update sliders
  domElements.gridSizeSlider.value = settings.gridSize;
  domElements.gridSizeValue.textContent = settings.gridSize;
  domElements.brightnessSlider.value = settings.brightness;
  domElements.brightnessValue.textContent = settings.brightness;
  domElements.dieColorInput.value = settings.dieColor;
  domElements.pointColorInput.value = settings.pointColor;
  domElements.sourceGrayscaleToggle.checked = settings.sourceGrayscale;

  // Update color selectors
  updateColorSelectors('dieColorSelectors', settings.dieColor);
  updateColorSelectors('pointColorSelectors', settings.pointColor);
}

/**
 * Update color selector highlighting
 */
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

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // File upload
  domElements.fileInput.addEventListener('change', handleFileSelect);
  domElements.uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    domElements.fileInput.click();
  });

  // Drag & drop
  domElements.uploadArea.addEventListener('dragover', handleDragOver);
  domElements.uploadArea.addEventListener('dragleave', handleDragLeave);
  domElements.uploadArea.addEventListener('drop', handleDrop);

  // Sliders
  domElements.gridSizeSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    domElements.gridSizeValue.textContent = value;
    debounce(() => app.updateSetting('gridSize', value));
  });

  domElements.brightnessSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    domElements.brightnessValue.textContent = value;
    debounce(() => app.updateSetting('brightness', value));
  });

  if (domElements.contrastSlider) {
    domElements.contrastSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      if (domElements.contrastValue) domElements.contrastValue.textContent = value;
      debounce(() => app.updateSetting('contrast', value));
    });
  }

  // Color pickers
  domElements.dieColorInput.addEventListener('change', (e) => {
    app.updateSetting('dieColor', e.target.value);
    updateColorSelectors('dieColorSelectors', e.target.value);
  });

  domElements.pointColorInput.addEventListener('change', (e) => {
    app.updateSetting('pointColor', e.target.value);
    updateColorSelectors('pointColorSelectors', e.target.value);
  });

  // Color selector buttons
  setupColorSelector('dieColorSelectors', 'dieColor');
  setupColorSelector('pointColorSelectors', 'pointColor');

  // Grayscale toggle
  domElements.sourceGrayscaleToggle.addEventListener('change', (e) => {
    app.updateSetting('sourceGrayscale', e.target.checked);
  });

  // Reset button
  domElements.resetBtn.addEventListener('click', () => {
    app.resetParameters();
  });

  // Comparison slider
  domElements.comparisonSlider.addEventListener('input', (e) => {
    const percent = e.target.value;
    const diceWrapper = document.querySelector('.dice-wrapper');
    if (diceWrapper) {
      diceWrapper.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }
    const comparisonLine = document.querySelector('.comparison-line');
    if (comparisonLine) comparisonLine.style.left = percent + '%';
    const comparisonHandle = document.querySelector('.comparison-handle');
    if (comparisonHandle) comparisonHandle.style.left = percent + '%';
  });

  // Export buttons
  setupExportButtons();
}

/**
 * Setup color selector buttons
 */
function setupColorSelector(containerId, settingKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const buttons = container.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      app.updateSetting(settingKey, color);
      const input = settingKey === 'dieColor' ? domElements.dieColorInput : domElements.pointColorInput;
      input.value = color;
      updateColorSelectors(containerId, color);
    });
  });
}

/**
 * Setup export button handlers
 */
function setupExportButtons() {
  // PDF Export
  if (domElements.downloadPdfBtn) {
    domElements.downloadPdfBtn.addEventListener('click', async () => {
      const btn = domElements.downloadPdfBtn;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Generating PDF...';
      if (window.lucide) window.lucide.createIcons();

      try {
        const blob = await app.handleExport('pdf', { autoSave: false });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dice-art-instructions.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        alert('Error generating PDF');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // 3D Print Modal
  if (domElements.export3dPrintBtn) {
    domElements.export3dPrintBtn.addEventListener('click', () => {
      const settings = app.getSettings();

      // Sync modal UI with current settings
      const sizeButtons = document.querySelectorAll('.size-btn');
      sizeButtons.forEach(btn => {
        const size = parseInt(btn.getAttribute('data-size'));
        if (size === settings.diceSize) {
          btn.classList.add('border-primary', 'bg-primary/20');
          btn.classList.remove('border-white/10');
        } else {
          btn.classList.remove('border-primary', 'bg-primary/20');
          btn.classList.add('border-white/10');
        }
      });

      if (domElements.exportModal) {
        domElements.exportModal.classList.remove('hidden');
      }
    });
  }

  // Modal handlers
  const closeModal = () => {
    if (domElements.exportModal) {
      domElements.exportModal.classList.add('hidden');
    }
  };

  if (domElements.cancelExportBtn) {
    domElements.cancelExportBtn.addEventListener('click', closeModal);
  }

  if (domElements.modalOverlay) {
    domElements.modalOverlay.addEventListener('click', closeModal);
  }

  // Confirm 3MF export from modal
  if (domElements.confirmExportBtn) {
    domElements.confirmExportBtn.addEventListener('click', async () => {
      const primeTower = document.getElementById('modalPrimeTower')?.checked || false;
      const raft = document.getElementById('modalRaft')?.checked || true;
      const spacing = document.getElementById('modalSpacing')?.checked || false;

      const btn = domElements.confirmExportBtn;
      const spinner = document.getElementById('exportSpinner');
      btn.disabled = true;
      if (spinner) spinner.classList.remove('hidden');

      try {
        const blob = await app.handleExport('3mf', { primeTower, raft, spacing, autoSave: false });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dice-art-model.3mf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        // closeModal(); // Fix: Keep modal open for multiple downloads
      } catch (error) {
        alert('Error generating 3D Print 3MF');
      } finally {
        btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
      }
    });
  }

  // Modal PDF button
  if (domElements.modalDownloadPdfBtn) {
    domElements.modalDownloadPdfBtn.addEventListener('click', async () => {
      const btn = domElements.modalDownloadPdfBtn;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const blob = await app.handleExport('pdf', { autoSave: false });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dice-art-instructions.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        alert('Error generating PDF');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // OpenSCAD Export
  if (domElements.downloadScadBtn) {
    domElements.downloadScadBtn.addEventListener('click', async () => {
      const btn = domElements.downloadScadBtn;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Generating SCAD...';
      if (window.lucide) window.lucide.createIcons();

      try {
        const blob = await app.handleExport('scad', { autoSave: false });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'dice-art-script.scad';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        alert('Error generating OpenSCAD');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Multi-plate export
  if (domElements.exportMultiPlateBtn) {
    domElements.exportMultiPlateBtn.addEventListener('click', async () => {
      const btn = domElements.exportMultiPlateBtn;
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Generating...';
      if (window.lucide) window.lucide.createIcons();

      try {
        await app.handleExport('3mf', { multiPlate: true, raft: true });
      } catch (error) {
        alert('Error generating multi-plate 3MF');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Dice size buttons in modal
  const sizeButtons = document.querySelectorAll('.size-btn');
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = parseInt(btn.getAttribute('data-size'));
      app.updateSetting('diceSize', size);

      // Update UI
      sizeButtons.forEach(b => {
        b.classList.remove('border-primary', 'bg-primary/20');
        b.classList.add('border-white/10');
      });
      btn.classList.add('border-primary', 'bg-primary/20');
      btn.classList.remove('border-white/10');
    });
  });
}

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    try {
      await app.processImage(file);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
}

/**
 * Drag and drop handlers
 */
function handleDragOver(event) {
  event.preventDefault();
  domElements.uploadArea.classList.add('border-primary/50', 'bg-white/[0.05]');
}

function handleDragLeave(event) {
  event.preventDefault();
  domElements.uploadArea.classList.remove('border-primary/50', 'bg-white/[0.05]');
}

async function handleDrop(event) {
  event.preventDefault();
  domElements.uploadArea.classList.remove('border-primary/50', 'bg-white/[0.05]');
  const file = event.dataTransfer.files[0];
  if (file) {
    try {
      await app.processImage(file);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
}

// Start the application
init().catch(error => {
  console.error('Failed to initialize application:', error);
  alert('Application initialization failed. Please refresh the page.');
});
