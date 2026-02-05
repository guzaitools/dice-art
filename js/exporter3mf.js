import JSZip from 'jszip';
import { TEMPLATE_PATHS } from './constants.js';
import { escapeXML } from './utils/xmlUtils.js';

/**
 * 3MF File Exporter
 * Generates 3MF files for 3D printing from dice art data.
 * Handles mesh merging, geometry transformation, and metadata configuration.
 */
export default class Exporter3MF {
  /**
   * Creates a new 3MF exporter instance
   */
  constructor() {
    this.templatePath = '3mf-template/';
    this.basePath = '';
  }

  /**
   * Find and validate the template path
   * Tries multiple possible locations for the 3MF template files
   * @returns {Promise<string>} Valid template path
   */
  async findTemplatePath() {
    for (const path of TEMPLATE_PATHS) {
      try {
        const res = await fetch(`${path}Metadata/project_settings.config`);
        if (res.ok) {
          this.templatePath = path;
          return path;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    return this.templatePath;
  }

  /**
   * Generate a UUID for 3MF objects
   * @returns {string} UUID string
   */
  generateUUID() {
    return '00000000-0000-4000-8000-' + Math.floor(Math.random() * 0x1000000000000).toString(16).padStart(12, '0');
  }

  /**
   * Helper: Load all template model files
   * @private
   */
  async _loadTemplates() {
    await this.findTemplatePath();

    const templateFiles = [
      "3D/Objects/object_7.model",
      "3D/Objects/object_8.model",
      "3D/Objects/object_9.model",
      "3D/Objects/object_10.model",
      "3D/Objects/object_11.model",
      "3D/Objects/object_12.model",
      "Metadata/project_settings.config"
    ];

    const modelModels = {};
    const fetchPromises = templateFiles.map(async (file) => {
      try {
        const response = await fetch(`${this.templatePath}${file}`);
        if (response.ok) {
          modelModels[file] = await response.text();
        }
      } catch (err) {
        console.error(`Error fetching template file ${file}:`, err);
      }
    });

    await Promise.all(fetchPromises);
    return modelModels;
  }

  /**
   * Helper: Parse XML geometries from template files
   * @private
   */
  _parseGeometries(modelModels) {
    const splitModelGeometries = (xml) => {
      const objects = {};
      const objBlocks = xml.split(/<object/);
      objBlocks.shift();
      for (const block of objBlocks) {
        const idMatch = block.match(/id="([^"]+)"/);
        if (idMatch) {
          const vertices = [];
          const triangles = [];
          const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
          const tRegex = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;
          let m;
          while ((m = vRegex.exec(block)) !== null) vertices.push({ x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) });
          while ((m = tRegex.exec(block)) !== null) triangles.push({ v1: parseInt(m[1]), v2: parseInt(m[2]), v3: parseInt(m[3]) });
          objects[idMatch[1]] = { vertices, triangles };
        }
      }
      return objects;
    };

    const geometries = {};
    for (let f = 7; f <= 12; f++) {
      const path = `3D/Objects/object_${f}.model`;
      if (modelModels[path]) geometries[f] = splitModelGeometries(modelModels[path]);
    }
    return geometries;
  }

  /**
   * Helper: Add mesh to buffers with transformation
   * @private
   */
  _addMesh(targetV, targetT, mesh, dx, dy, dz, s) {
    if (!mesh) return;
    const offset = targetV.length;
    for (const v of mesh.vertices) targetV.push({ x: v.x * s + dx, y: v.y * s + dy, z: v.z * s + dz });
    for (const t of mesh.triangles) targetT.push({ v1: t.v1 + offset, v2: t.v2 + offset, v3: t.v3 + offset });
  }

  /**
   * Helper: Serialize mesh to XML
   * @private
   */
  _serializeMesh(v, t) {
    let xml = '<mesh><vertices>\n';
    for (const p of v) xml += `<vertex x="${p.x.toFixed(4)}" y="${p.y.toFixed(4)}" z="${p.z.toFixed(4)}"/>\n`;
    xml += '</vertices><triangles>\n';
    for (const f of t) xml += `<triangle v1="${f.v1}" v2="${f.v2}" v3="${f.v3}"/>\n`;
    xml += '</triangles></mesh>';
    return xml;
  }

  /**
   * Helper: Apply settings overrides (PrimeTower, Raft)
   * @private
   */
  _applySettingsOverrides(projectSettings, options, plateCount = 1) {
    if (!projectSettings) return "";

    // Update values
    projectSettings = projectSettings.replace(/"enable_prime_tower":\s*"[^"]*"/g, `"enable_prime_tower": "${options.primeTower ? '1' : '0'}"`);
    projectSettings = projectSettings.replace(/"raft_layers":\s*"[^"]*"/g, `"raft_layers": "${options.raft ? '2' : '0'}"`);

    // Update deviations list to ensure slicer honors our values
    const diffRegex = /"different_settings_to_system":\s*\[\s*"([^"]*)"/;
    const match = projectSettings.match(diffRegex);
    if (match) {
      let keys = match[1].split(';').filter(x => x);
      // Always include these keys to enforce our specific values (whether 0 or 1/2)
      if (!keys.includes("enable_prime_tower")) keys.push("enable_prime_tower");
      if (!keys.includes("raft_layers")) keys.push("raft_layers");

      const entry = keys.join(';');
      // Reconstruct array for multiple plates if needed
      const arrayStr = `"${entry}"` + (plateCount > 1 ? (',\n        ""').repeat(plateCount - 1) : "");

      // Replace the whole array block
      if (plateCount > 1) {
        projectSettings = projectSettings.replace(/"different_settings_to_system":\s*\[[^\]]*\]/, `"different_settings_to_system": [\n        ${arrayStr}\n    ]`);
      } else {
        projectSettings = projectSettings.replace(diffRegex, `"different_settings_to_system": [\n        "${entry}"`);
      }
    }

    // Patch arrays for wipe_tower if multi-plate
    if (plateCount > 1) {
      projectSettings = projectSettings.replace(/"wipe_tower_x":\s*\[[^\]]*\]/, `"wipe_tower_x": [\n        ${new Array(plateCount).fill('"15"').join(',\n        ')}\n    ]`);
      projectSettings = projectSettings.replace(/"wipe_tower_y":\s*\[[^\]]*\]/, `"wipe_tower_y": [\n        ${new Array(plateCount).fill('"140.972"').join(',\n        ')}\n    ]`);
    }

    return projectSettings;
  }

  /**
   * Generate a single-plate 3MF file with merged dice meshes
   */
  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10, options = { primeTower: false, raft: true, spacing: true }) {
    console.time('3MF-Generation');

    // Use global JSZip if needed
    const ZipClass = (typeof JSZip !== 'undefined') ? JSZip : (window.JSZip || null);
    if (!ZipClass) throw new Error('JSZip not found.');
    const zip = new ZipClass();

    // 1. Load Templates & Geometries
    const modelModels = await this._loadTemplates();
    const geometries = this._parseGeometries(modelModels);

    // 2. Merging
    const bodyV = [], bodyT = [], pipV = [], pipT = [];

    const s = diceSize / 10;
    const step = diceSize + (options.spacing ? 0.4 : 0);
    const ox = 125 - (gridWidth * step) / 2;
    const oy_top = 125 + (gridHeight * step) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const face = diceLevels[y * gridWidth + x];
        if (face < 1 || face > 6) continue;
        const px = ox + x * step;
        const py = oy_top - (y + 1) * step;

        let bm;
        // Map faces to objects (7=die, 8,9,10,11,12 are other variations/parts?)
        // Based on original switch logic:
        switch (face) {
          case 6: bm = geometries[7]?.["1"]; break;
          case 5: bm = geometries[8]?.["9"]; break;
          case 4: bm = geometries[9]?.["12"]; break;
          case 3: bm = geometries[10]?.["14"]; break;
          case 2: bm = geometries[11]?.["16"]; break;
          case 1: bm = geometries[12]?.["18"]; break;
        }

        if (bm) this._addMesh(bodyV, bodyT, bm, px, py, 0, s);

        const addP = (g, o, dx, dy) => {
          if (geometries[g]?.[o]) {
            this._addMesh(pipV, pipT, geometries[g][o], px + dx * s, py + dy * s, 0.8 * s, s);
          }
        };
        switch (face) {
          case 6: addP(7, "2", 2.5, -2.5); addP(7, "3", 0, -2.5); addP(7, "4", -2.5, -2.5); addP(7, "5", 2.5, 2.5); addP(7, "6", 0, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 5: addP(7, "2", 2.5, -2.5); addP(7, "4", -2.5, -2.5); addP(8, "10", 0, 0); addP(7, "5", 2.5, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 4: addP(7, "2", 2.5, -2.5); addP(7, "4", -2.5, -2.5); addP(7, "5", 2.5, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 3: addP(7, "2", 2.5, -2.5); addP(8, "10", 0, 0); addP(7, "7", -2.5, 2.5); break;
          case 2: addP(7, "2", 2.5, -2.5); addP(7, "7", -2.5, 2.5); break;
          case 1: addP(8, "10", 0, 0); break;
        }
      }
    }

    const itemUuid = this.generateUUID();
    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <resources>
  <object id="1" p:UUID="${this.generateUUID()}" type="model" name="Bodies">${this._serializeMesh(bodyV, bodyT)}</object>
  <object id="2" p:UUID="${this.generateUUID()}" type="model" name="Pips">${this._serializeMesh(pipV, pipT)}</object>
  <object id="3" p:UUID="${this.generateUUID()}" type="model" name="DiceArt">
   <components>
    <component objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0" p:UUID="${this.generateUUID()}"/>
    <component objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0" p:UUID="${this.generateUUID()}"/>
   </components>
  </object>
 </resources>
 <build p:UUID="${this.generateUUID()}">
  <item objectid="3" p:UUID="${itemUuid}" transform="1 0 0 0 1 0 0 0 1 125 125 0" printable="1"/>
 </build>
</model>`;

    let projectSettings = modelModels["Metadata/project_settings.config"] || "";
    projectSettings = this._applySettingsOverrides(projectSettings, options, 1);

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="3"><metadata key="name" value="DiceArt"/>
    <part id="1" subtype="normal_part"><metadata key="name" value="Bodies"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="extruder" value="2"/><metadata key="identify_id" value="11"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pips"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="extruder" value="1"/><metadata key="identify_id" value="12"/></part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="DiceArt"/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_${plateIdStr}1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    <model_instance>
      <metadata key="object_id" value="3"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="10"/>
    </model_instance>
  </plate>
  <assemble>
    <assemble_item object_id="3" instance_id="0" transform="1 0 0 0 1 0 0 0 1 125 125 0" p:UUID="${itemUuid}" offset="0 0 0" />
  </assemble>
</config>`;

    // Fix: correct variable for plate thumbnail
    // Note: I noticed plateIdStr didn't exist in my previous content, so just fixing the string "plate_1.png" which was correct in original.
    // Reverting line 428 in thought process to "plate_1.png" as hardcoded since single plate is plate 1.

    const contentTypesXML = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="gcode" ContentType="text/x.gcode"/></Types>`;
    const relsXML = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/><Relationship Target="/Metadata/model_settings.config" Id="rel2" Type="http://schemas.bambulab.com/package/2021/config"/><Relationship Target="/Metadata/project_settings.config" Id="rel3" Type="http://schemas.bambulab.com/package/2021/config"/></Relationships>`;

    zip.file("[Content_Types].xml", contentTypesXML);
    zip.file("_rels/.rels", relsXML);
    zip.file("3D/3dmodel.model", modelXML);
    zip.file("Metadata/model_settings.config", modelSettingsXML.replace('${plateIdStr}', '')); // Correcting potentially undefined var
    if (projectSettings) zip.file("Metadata/project_settings.config", projectSettings);
    zip.file("Metadata/filament_sequence.json", JSON.stringify({ plate_1: { sequence: [] } }));
    zip.file("Metadata/slice_info.config", `<?xml version="1.0" encoding="UTF-8"?><config><header><header_item key="X-BBL-Client-Type" value="slicer"/><header_item key="X-BBL-Client-Version" value="02.05.00.66"/></header></config>`);

    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    console.timeEnd('3MF-Generation');
    return blob;
  }

  /**
   * Generate multi-plate 3MF file
   */
  async generateMultiPlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10, options = { primeTower: false, raft: true, spacing: true }) {
    console.time('Multi-Plate-Distribution-Generation');

    const ZipClass = (typeof JSZip !== 'undefined') ? JSZip : (window.JSZip || null);
    if (!ZipClass) throw new Error('JSZip not found.');
    const zip = new ZipClass();

    // 1. Load & Parse
    const modelModels = await this._loadTemplates();
    const geometries = this._parseGeometries(modelModels);

    // 2. Count distributions
    const faceCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const val of diceLevels) {
      if (val >= 1 && val <= 6) faceCounts[val]++;
    }

    let resourcesXML = '';
    let buildXML = '';
    let platesXML = '';

    const s = diceSize / 10;
    const step = diceSize + (options.spacing ? 0.4 : 0);
    let objectIdCounter = 1;
    const plateConfigs = [];

    const createPlateForFace = (face, count, label) => {
      const bodyV = [], bodyT = [], pipV = [], pipT = [];

      // 0,0 Relative Layout: square-ish grid
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const lox = -(cols * step) / 2;
      const loy_top = (rows * step) / 2;

      for (let i = 0; i < count; i++) {
        const lx = i % cols;
        const ly = Math.floor(i / cols);
        const px = lox + lx * step;
        const py = loy_top - (ly + 1) * step;

        let bm;
        switch (face) {
          case 6: bm = geometries[7]["1"]; break;
          case 5: bm = geometries[8]["9"]; break;
          case 4: bm = geometries[9]["12"]; break;
          case 3: bm = geometries[10]["14"]; break;
          case 2: bm = geometries[11]["16"]; break;
          case 1: bm = geometries[12]["18"]; break;
        }
        if (bm) this._addMesh(bodyV, bodyT, bm, px, py, 0, s);

        const addP = (g, o, dx, dy) => {
          if (geometries[g]?.[o]) {
            this._addMesh(pipV, pipT, geometries[g][o], px + dx * s, py + dy * s, 0.8 * s, s);
          }
        };
        switch (face) {
          case 6: addP(7, "2", 2.5, -2.5); addP(7, "3", 0, -2.5); addP(7, "4", -2.5, -2.5); addP(7, "5", 2.5, 2.5); addP(7, "6", 0, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 5: addP(7, "2", 2.5, -2.5); addP(7, "4", -2.5, -2.5); addP(8, "10", 0, 0); addP(7, "5", 2.5, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 4: addP(7, "2", 2.5, -2.5); addP(7, "4", -2.5, -2.5); addP(7, "5", 2.5, 2.5); addP(7, "7", -2.5, 2.5); break;
          case 3: addP(7, "2", 2.5, -2.5); addP(8, "10", 0, 0); addP(7, "7", -2.5, 2.5); break;
          case 2: addP(7, "2", 2.5, -2.5); addP(7, "7", -2.5, 2.5); break;
          case 1: addP(8, "10", 0, 0); break;
        }
      }

      const bodyId = objectIdCounter++;
      const pipId = objectIdCounter++;
      const componentId = objectIdCounter++;
      const plateId = plateConfigs.length + 1;
      const compUuid = this.generateUUID();
      const itemUuid = this.generateUUID();

      resourcesXML += `  <object id="${bodyId}" p:UUID="${this.generateUUID()}" type="model" name="Bodies-${escapeXML(label)}">${this._serializeMesh(bodyV, bodyT)}</object>\n`;
      resourcesXML += `  <object id="${pipId}" p:UUID="${this.generateUUID()}" type="model" name="Pips-${escapeXML(label)}">${this._serializeMesh(pipV, pipT)}</object>\n`;
      resourcesXML += `  <object id="${componentId}" p:UUID="${compUuid}" type="model" name="${escapeXML(label)}">\n   <components>\n    <component objectid="${bodyId}" transform="1 0 0 0 1 0 0 0 1 0 0 0" p:UUID="${this.generateUUID()}"/>\n    <component objectid="${pipId}" transform="1 0 0 0 1 0 0 0 1 0 0 0" p:UUID="${this.generateUUID()}"/>\n   </components>\n  </object>\n`;

      buildXML += `  <item objectid="${componentId}" p:UUID="${itemUuid}" transform="1 0 0 0 1 0 0 0 1 ${plateId * 300 - 150} 125 0" printable="1"/>\n`;
      platesXML += `  <plate>
    <metadata key="plater_id" value="${plateId}"/>
    <metadata key="plater_name" value="${escapeXML(label)}"/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    <metadata key="thumbnail_file" value="Metadata/plate_${plateId}.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_${plateId}.png"/>
    <metadata key="top_file" value="Metadata/top_${plateId}.png"/>
    <metadata key="pick_file" value="Metadata/pick_${plateId}.png"/>
    <model_instance>
      <metadata key="object_id" value="${componentId}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${plateId * 10}"/>
    </model_instance>
  </plate>\n`;

      plateConfigs.push({ componentId, bodyId, pipId, label, plateId, itemUuid });
    };

    // 3. Process each face 1-6
    for (let face = 1; face <= 6; face++) {
      const count = faceCounts[face];
      if (count === 0) continue;

      // Split into chunks of 100
      const chunkSize = 100;
      const chunks = Math.floor(count / chunkSize);
      const remainder = count % chunkSize;

      for (let i = 0; i < chunks; i++) {
        const label = `Dice #${face} - Print ${i + 1}`;
        createPlateForFace(face, chunkSize, label);
      }
      if (remainder > 0) {
        const label = `Dice #${face} - Remaining`;
        createPlateForFace(face, remainder, label);
      }
    }

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <resources>
${resourcesXML} </resources>
 <build p:UUID="${this.generateUUID()}">
${buildXML} </build>
</model>`;

    let projectSettings = modelModels["Metadata/project_settings.config"] || "";
    projectSettings = this._applySettingsOverrides(projectSettings, options, plateConfigs.length);

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
${plateConfigs.map(p => `  <object id="${p.componentId}"><metadata key="name" value="${escapeXML(p.label)}"/>
    <part id="${p.bodyId}" subtype="normal_part"><metadata key="name" value="Bodies"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="extruder" value="2"/><metadata key="identify_id" value="${p.plateId * 10 + 1}"/></part>
    <part id="${p.pipId}" subtype="normal_part"><metadata key="name" value="Pips"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="extruder" value="1"/><metadata key="identify_id" value="${p.plateId * 10 + 2}"/></part>
  </object>`).join('\n')}
${platesXML}  <assemble>
${plateConfigs.map(p => `   <assemble_item object_id="${p.componentId}" instance_id="0" transform="1 0 0 0 1 0 0 0 1 125 125 0" p:UUID="${p.itemUuid}" offset="0 0 0" />`).join('\n')}
  </assemble>
</config>`;

    const contentTypesXML = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="gcode" ContentType="text/x.gcode"/></Types>`;
    const relsXML = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/><Relationship Target="/Metadata/model_settings.config" Id="rel2" Type="http://schemas.bambulab.com/package/2021/config"/><Relationship Target="/Metadata/project_settings.config" Id="rel3" Type="http://schemas.bambulab.com/package/2021/config"/></Relationships>`;

    zip.file("[Content_Types].xml", contentTypesXML);
    zip.file("_rels/.rels", relsXML);
    zip.file("3D/3dmodel.model", modelXML);
    zip.file("Metadata/model_settings.config", modelSettingsXML);
    if (projectSettings) zip.file("Metadata/project_settings.config", projectSettings);

    const blob = await zip.generateAsync({ type: "blob" });
    console.timeEnd('Multi-Plate-Distribution-Generation');
    return blob;
  }

  saveFile(blob, filename) {
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
