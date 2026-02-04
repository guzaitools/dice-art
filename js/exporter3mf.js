import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10, options = { primeTower: false, raft: true, spacing: true }) {
    console.time('3MF-Generation');
    console.log(`Generating refined mesh-merged 3MF (${diceSize}mm)...`, options);
    const zip = new JSZip();

    // 1. Fetch template geometries and config
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

    // 2. Mesh Parser (Super Robust)
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

    // 3. Merging
    const bodyV = [], bodyT = [], pipV = [], pipT = [];
    const addMesh = (targetV, targetT, mesh, dx, dy, dz, s) => {
      if (!mesh) return;
      const offset = targetV.length;
      for (const v of mesh.vertices) targetV.push({ x: v.x * s + dx, y: v.y * s + dy, z: v.z * s + dz });
      for (const t of mesh.triangles) targetT.push({ v1: t.v1 + offset, v2: t.v2 + offset, v3: t.v3 + offset });
    };

    const s = diceSize / 10;
    const step = diceSize + (options.spacing ? 0.4 : 0); // Spacing option
    const ox = 125 - (gridWidth * step) / 2;
    const oy_top = 125 + (gridHeight * step) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const face = diceLevels[y * gridWidth + x];
        if (face < 1 || face > 6) continue;
        const px = ox + x * step;
        const py = oy_top - (y + 1) * step;

        let bm;
        switch (face) {
          case 6: bm = geometries[7]["1"]; break;
          case 5: bm = geometries[8]["9"]; break;
          case 4: bm = geometries[9]["12"]; break;
          case 3: bm = geometries[10]["14"]; break;
          case 2: bm = geometries[11]["16"]; break;
          case 1: bm = geometries[12]["18"]; break;
        }
        addMesh(bodyV, bodyT, bm, px, py, 0, s);

        const addP = (g, o, dx, dy) => addMesh(pipV, pipT, geometries[g][o], px + dx * s, py + dy * s, 0.8 * s, s);
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

    // 4. Build Minimal 3MF (Self-contained)
    const serialize = (v, t) => {
      let xml = '<mesh><vertices>\n';
      const lenV = v.length;
      for (let i = 0; i < lenV; i++) {
        const p = v[i];
        xml += `<vertex x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" z="${p.z.toFixed(2)}"/>\n`;
      }
      xml += '</vertices><triangles>\n';
      const lenT = t.length;
      for (let i = 0; i < lenT; i++) {
        const f = t[i];
        xml += `<triangle v1="${f.v1}" v2="${f.v2}" v3="${f.v3}"/>\n`;
      }
      xml += '</triangles></mesh>';
      return xml;
    };

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
 <resources>
  <object id="1" type="model">
    ${serialize(bodyV, bodyT)}
  </object>
  <object id="2" type="model">
    ${serialize(pipV, pipT)}
  </object>
 </resources>
 <build>
  <item objectid="1"/>
  <item objectid="2"/>
 </build>
</model>`;

    // 5. Config injection (Prime Tower & Raft)
    let projectSettings = modelModels["Metadata/project_settings.config"] || "";
    if (projectSettings) {
      console.log("Injecting 3MF metadata options:", options);

      // Global replacement to catch all occurrences
      projectSettings = projectSettings.replace(/"enable_prime_tower":\s*"[^"]*"/g, `"enable_prime_tower": "${options.primeTower ? '1' : '0'}"`);
      projectSettings = projectSettings.replace(/"raft_layers":\s*"[^"]*"/g, `"raft_layers": "${options.raft ? '2' : '0'}"`);

      console.log(`- Prime Tower: ${options.primeTower ? 'Enabled (1)' : 'Disabled (0)'}`);
      console.log(`- Raft Layers: ${options.raft ? '2' : '0'}`);
    }

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1"><metadata key="name" value="Bodies"/><metadata key="extruder" value="2"/></object>
  <object id="2"><metadata key="name" value="Pips"/><metadata key="extruder" value="1"/></object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/></model_instance>
    <model_instance><metadata key="object_id" value="2"/><metadata key="instance_id" value="0"/></model_instance>
  </plate>
</config>`;

    const contentTypesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
 <Default Extension="config" ContentType="application/vnd.ms-package.3dmanufacturing-config+xml"/>
</Types>`;

    const relsXML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
 <Relationship Target="/Metadata/model_settings.config" Id="rel2" Type="http://schemas.bambulab.com/package/2021/config"/>
 <Relationship Target="/Metadata/project_settings.config" Id="rel3" Type="http://schemas.bambulab.com/package/2021/config"/>
</Relationships>`;

    zip.file("[Content_Types].xml", contentTypesXML);
    zip.file("_rels/.rels", relsXML);
    zip.file("3D/3dmodel.model", modelXML);
    zip.file("Metadata/model_settings.config", modelSettingsXML);
    if (projectSettings) {
      zip.file("Metadata/project_settings.config", projectSettings);
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    console.timeEnd('3MF-Generation');
    return blob;
  }

  async generate3MF(diceLevels, gridWidth, gridHeight) {
    return this.generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, 10);
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
