# Dice Art - Technical Documentation

## Overview
Dice Art is a client-side JavaScript application that transforms images into mosaic art using 6-sided dice. It allows users to upload images, adjust parameters (grid size, brightness, contrast), and export the result as PDF instructions, 3D printable models (3MF), or OpenSCAD scripts.

## Architecture

The application follows a modular architecture using ES6 modules.

### High-Level Architecture (Mermaid)

```mermaid
graph TD
    User[User Interface] -->|Events| App(app.js)
    App -->|Controls| AC[AppController]
    
    subgraph Core Logic
        AC -->|Manages| SM[SettingsManager]
        AC -->|Uses| IP[ImageProcessor]
        AC -->|Uses| DR[DiceRenderer]
        AC -->|Delegates Export| EF[ExporterFactory]
        AC -->|Updates| UM[UIManager]
    end
    
    subgraph Image Processing Pipeline
        IP -->|1. Load| Raw[Raw Image]
        IP -->|2. Grayscale| Gray[Grayscale Data]
        IP -->|3. Adjust| Adj[Adjusted Data]
        IP -->|4. Pixelate| Grid[Grid Data]
        IP -->|5. Map| Levels[Dice Levels 1-6]
    end
    
    subgraph Export System
        EF -->|Creates| ES[ExporterStrategy]
        ES <|-- PDF[PDFExporterStrategy]
        ES <|-- 3MF[ThreeMFExporterStrategy]
        ES <|-- SCAD[SCADExporterStrategy]
    end

    AC -->|Render| DR
    DR -->|Draws to| Canvas[HTML5 Canvas]
```

## Key Components

### 1. **Core**
-   **`AppController`**: The central orchestrator. It connects the UI, settings, and business logic. It handles the main image processing workflow.
-   **`SettingsManager`**: Manages application state (grid size, colors, etc.) and notifies listeners of changes.
-   **`UIManager`**: Handles low-level UI operations like updating text, showing/hiding sections, and managing sliders.

### 2. **Processing**
-   **`ImageProcessor`**: Contains the core algorithms for converting an image into a grid of dice.
    -   *Luminosity Method*: Used for grayscale conversion (`0.299*R + 0.587*G + 0.114*B`).
    -   *Mapping*: Maps 0-255 grayscale values to 1-6 dice values (Darker = Lower value/More dots? No, typically Darker = 1 (most ink) or 6 (least ink)? In this app: Darkest (0-42) = 1, Lightest (213-255) = 6).

### 3. **Rendering**
-   **`DiceRenderer`**: Visualizes the dice grid on a Canvas. It uses pre-rendered tinted dice images to ensure performance.

### 4. **Exporting (Strategy Pattern)**
-   **`ExporterFactory`**: Returns the appropriate exporter based on format ('pdf', '3mf', 'scad').
-   **`ExporterStrategy`**: Base class defining the export interface.
-   **`PDFExporterStrategy`**: Generates printable instructions using `jspdf`.
-   **`ThreeMFExporterStrategy`**: Generates 3D models using `jszip` and XML templating.
-   **`SCADExporterStrategy`**: Generates OpenSCAD scripts.

## Directory Structure

```
/
├── index.html          # Main entry point
├── app.js              # Bootstrapping and event listeners
├── js/
│   ├── core/           # Core logic (AppController, UIManager, etc.)
│   ├── exporters/      # Export strategies
│   ├── utils/          # Helpers (validators, geometry)
│   ├── imageProcessor.js
│   ├── diceRenderer.js
│   ├── constants.js    # Global constants
```

## Future Improvements
-   **Web Workers**: Move heavy image processing to a background thread to prevent UI freezing.
-   **WASM**: Implement core processing in Rust/WASM for higher performance.
-   **Security**: Implement CSP and stricter file validation.
