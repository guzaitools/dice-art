# Dice Art - Code Architecture

## Overview
This document describes the architecture and module organization of the Dice Art application after the Phase 1 & 2 refactoring.

## Module Structure

```
js/
├── core/                    # Core application modules
│   ├── SettingsManager.js  # Settings persistence & validation
│   ├── UIManager.js         # DOM interactions & UI state
│   └── (AppController.js)   # Main orchestrator (Phase 3)
├── utils/                   # Utility functions
│   ├── validators.js        # Input validation & sanitization
│   └── geometryHelpers.js   # 3D geometry operations
├── constants.js             # Application constants
├── imageProcessor.js        # Image loading & processing
├── diceRenderer.js          # Canvas rendering
├── exporter3mf.js          # 3MF model generation
├── pdfExporter.js          # PDF generation
├── scadExporter.js         # OpenSCAD generation
└── preview3d.js            # 3D preview
```

## Core Modules

### SettingsManager
**Responsibility:** Handle all application settings
- Load/save from localStorage
- Validate settings before use
- Provide getters/setters
- Track modifications

**Usage:**
```javascript
const settingsManager = new SettingsManager(defaults);
settingsManager.loadSettings();
settingsManager.updateSetting('gridSize', 50);
const settings = settingsManager.getSettings();
```

### UIManager
**Responsibility:** All DOM interactions
- Section visibility
- Loading states
- Statistics display
- Error messages
- Button states

**Usage:**
```javascript
const uiManager = new UIManager(domElements);
uiManager.showSection('processing');
uiManager.setLoading(true, 'Processing image...');
uiManager.updateDiceStats(diceLevels, width, height);
```

## Utility Modules

### validators.js
Input validation and sanitization:
- `sanitizeHexColor()` - Validate color strings
- `validateFile()` - Check file type/size
- `sanitizeGridSize()` - Clamp grid dimensions
- `sanitizeSettings()` - Validate entire settings object

### geometryHelpers.js
3D geometry operations:
- `transformVertex()` - Apply transformations
- `mergeMesh()` - Combine meshes
- `serializeGeometry()` - Convert to XML
- `parseModelGeometries()` - Parse 3MF XML

## Constants

All magic numbers centralized in `constants.js`:
- File/canvas sizes
- Color defaults
- Grid limits
- Export settings

## Data Flow

```
User Input → Validators → SettingsManager
            ↓
File Upload → ImageProcessor → DiceRenderer → Canvas
                               ↓
Export Request → Exporter3MF/PDFExporter → Download
                               ↓
UIManager ← Status Updates ← Processing Pipeline
```

## Security

- **Input Validation:** All user inputs validated/sanitized
- **File Size Limits:** 10MB max
- **Type Checking:** Allowed formats enforced
- **Settings Validation:** All settings sanitized before use

## Performance

- **Constants:** Avoid recomputation
- **Chunked Rendering:** Prevents UI blocking
- **Pre-rendered Dice:** Tinted dice cached
- **Efficient Merging:** Geometry pooling

## Best Practices

1. **Single Responsibility:** Each module has one clear purpose
2. **Dependency Injection:** Ready for Phase 3  
3. **JSDoc:** All public methods documented
4. **Error Handling:** Try-catch at boundaries
5. **Validation:** All inputs sanitized

## Next Steps (Phase 3)

- Extract `AppController` from `app.js`
- Implement Strategy pattern for exporters
- Add TypeScript interfaces (optional)
- Further split large modules
