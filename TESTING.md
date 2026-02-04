# Integration Testing Checklist

## Manual Testing Required

### ✅ Basic Functionality
- [ ] Open the app in browser (http://localhost:8000)
- [ ] Verify app loads without errors (check console)
- [ ] Settings persist after page refresh

### ✅ Image Upload Flow
- [ ] Upload an image via file picker
- [ ] Upload an image via drag & drop
- [ ] Verify image appears in originalCanvas
- [ ] Verify dice art renders in diceCanvas

### ✅ Processing Controls
- [ ] Grid Size slider updates and reprocesses
- [ ] Brightness slider updates and reprocesses
- [ ] Contrast slider updates and reprocesses (if exists)
- [ ] Die color picker works
- [ ] Point color picker works
- [ ] Grayscale toggle works
- [  ] Color selector buttons work
- [ ] Reset button clears everything

### ✅ Comparison Slider
- [ ] Slider moves smoothly
- [ ] Reveals original vs dice art correctly

### ✅ Exports
- [ ] PDF export generates and downloads
- [ ] 3MF export (via modal) generates and downloads
- [ ] OpenSCAD export generates and downloads
- [ ] Multi-plate 3MF export works
- [ ] Prime tower option works
- [ ] Raft option works
- [ ] Dice size selection works (5mm, 10mm, 15mm)

### ✅ Performance
- [ ] No lag when adjusting sliders
- [ ] Cache works (changing settings back should be instant)
- [ ] Large images process without freezing

### ✅ UI/UX
- [ ] Loading states show correctly
- [ ] Error messages appear when needed
- [ ] Buttons disable during export
- [ ] Modal opens/closes correctly
- [ ] Icons render properly (Lucide)

## Automated Tests (Future)

### Unit Tests Needed:
```javascript
// tests/unit/validators.test.js
describe('Validators', () => {
  test('sanitizeHexColor validates colors correctly');
  test('validateFile rejects invalid files');
  test('clamp works correctly');
});

// tests/unit/SettingsManager.test.js
describe('SettingsManager', () => {
  test('loads settings from localStorage');
  test('saves settings correctly');
  test('sanitizes settings before save');
});

// tests/unit/ExporterFactory.test.js
describe('ExporterFactory', () => {
  test('registers exporters correctly');
  test('throws error for unknown format');
  test('exports work end-to-end');
});
```

### Integration Tests Needed:
```javascript
// tests/integration/processing.test.js
describe('Image Processing', () => {
  test('full pipeline from upload to render');
  test('settings changes trigger reprocess');
  test('cache improves performance');
});
```

## Known Issues to Watch For

1. **Import Paths**: Ensure all imports resolve correctly
2. **DOM Elements**: Check that all element IDs match
3. **Event Handlers**: Verify no duplicate listeners
4. **Memory Leaks**: Monitor canvas cleanup
5. **Cache Invalidation**: Ensure cache keys are unique

## Quick Smoke Test Script

Run in browser console after loading app:

```javascript
// Check if app initialized
console.log('App instance:', window.app !== undefined);

// Check settings
console.log('Settings:', app.getSettings());

// Check exporters
console.log('Supported formats:', app.exporterFactory.getSupportedFormats());

// Test a setting change
app.updateSetting('gridSize', 30);
console.log('Grid size updated:', app.getSettings().gridSize === 30);
```

## Regression Checklist

Compare with main branch:
- [ ] All previous features still work
- [ ] No new console errors
- [ ] Performance same or better
- [ ] File sizes reasonable
- [ ] Export quality unchanged
