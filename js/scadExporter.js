export default class ExporterSCAD {
    constructor() { }

    /**
     * Generates an OpenSCAD script for the dice art.
     * Expects 6 STL files named die_1.stl, die_2.stl, etc. to be in the same folder.
     */
    generateSCAD(diceLevels, gridWidth, gridHeight, diceSize = 10) {
        let scad = `// Dice Art OpenSCAD Script\n`;
        scad += `// Instructions: Place die_1.stl through die_6.stl in the same folder as this script.\n\n`;
        scad += `dice_size = ${diceSize};\n`;
        scad += `spacing = 0.1;\n`;
        scad += `step = dice_size + spacing;\n\n`;

        scad += `module die(face) {\n`;
        scad += `  if (face == 1) import("die_1.stl");\n`;
        scad += `  else if (face == 2) import("die_2.stl");\n`;
        scad += `  else if (face == 3) import("die_3.stl");\n`;
        scad += `  else if (face == 4) import("die_4.stl");\n`;
        scad += `  else if (face == 5) import("die_5.stl");\n`;
        scad += `  else if (face == 6) import("die_6.stl");\n`;
        scad += `}\n\n`;

        scad += `union() {\n`;

        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const face = diceLevels[y * gridWidth + x];
                if (face < 1 || face > 6) continue;

                // Note: OpenSCAD Y increases upwards. Canvas Y increases downwards.
                // We flip Y to match visual representation.
                const invY = gridHeight - 1 - y;
                scad += `  translate([${x} * step, ${invY} * step, 0]) die(${face});\n`;
            }
        }

        scad += `}\n`;
        return scad;
    }

    saveFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
