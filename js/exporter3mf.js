import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10) {
    console.time('3MF-Generation');
    console.log(`Generating robust mesh-merged 3MF (${diceSize}mm)...`);
    const zip = new JSZip();

    // 1. Fetch template assets
    const templateFiles = [
      "[Content_Types].xml",
      "_rels/.rels",
      "3D/_rels/3dmodel.model.rels",
      "3D/Objects/object_7.model",
      "3D/Objects/object_8.model",
      "3D/Objects/object_9.model",
      "3D/Objects/object_10.model",
      "3D/Objects/object_11.model",
      "3D/Objects/object_12.model",
      "Metadata/plate_1.png",
      "Metadata/plate_1_small.png",
      "Metadata/plate_no_light_1.png",
      "Metadata/top_1.png",
      "Metadata/pick_1.png",
      "Metadata/project_settings.config",
      "Metadata/cut_information.xml",
      "Metadata/slice_info.config",
      "Metadata/filament_sequence.json"
    ];

    const modelModels = {};
    const fetchPromises = templateFiles.map(async (file) => {
      try {
        const response = await fetch(`${this.templatePath}${file}`);
        if (response.ok) {
          if (file.endsWith('.model')) {
            modelModels[file] = await response.text();
          } else {
            const blob = await response.blob();
            zip.file(file, blob);
          }
        }
      } catch (err) {
        console.error(`Error fetching template file ${file}:`, err);
      }
    });
    await Promise.all(fetchPromises);

    // 2. Mesh Parser Utility (Robust)
    const parseMesh = (xml) => {
      const vertices = [];
      const triangles = [];

      const vRegex = /<vertex\s+([^>]+)>/g;
      const tRegex = /<triangle\s+([^>]+)>/g;

      let match;
      while ((match = vRegex.exec(xml)) !== null) {
        const attrStr = match[1];
        const x = attrStr.match(/x="([^"]+)"/);
        const y = attrStr.match(/y="([^"]+)"/);
        const z = attrStr.match(/z="([^"]+)"/);
        if (x && y && z) {
          vertices.push({ x: parseFloat(x[1]), y: parseFloat(y[1]), z: parseFloat(z[1]) });
        }
      }
      while ((match = tRegex.exec(xml)) !== null) {
        const attrStr = match[1];
        const v1 = attrStr.match(/v1="([^"]+)"/);
        const v2 = attrStr.match(/v2="([^"]+)"/);
        const v3 = attrStr.match(/v3="([^"]+)"/);
        if (v1 && v2 && v3) {
          triangles.push({ v1: parseInt(v1[1]), v2: parseInt(v2[1]), v3: parseInt(v3[1]) });
        }
      }
      return { vertices, triangles };
    };

    const splitModelGeometries = (xml) => {
      const objects = {};
      const objBlocks = xml.split(/<object/);
      objBlocks.shift(); // remove header
      for (const block of objBlocks) {
        const idMatch = block.match(/id="([^"]+)"/);
        if (idMatch) {
          objects[idMatch[1]] = parseMesh(block);
        }
      }
      return objects;
    };

    const geometries = {};
    for (let f = 7; f <= 12; f++) {
      const path = `3D/Objects/object_${f}.model`;
      if (modelModels[path]) {
        geometries[f] = splitModelGeometries(modelModels[path]);
      }
    }

    // 3. Merging Logic
    const bodyVertices = [];
    const bodyTriangles = [];
    const pipVertices = [];
    const pipTriangles = [];

    const addMesh = (targetV, targetT, mesh, dx, dy, dz, scale) => {
      if (!mesh || !mesh.vertices) return;
      const vOffset = targetV.length;
      const len = mesh.vertices.length;
      for (let i = 0; i < len; i++) {
        const v = mesh.vertices[i];
        targetV.push({
          x: v.x * scale + dx,
          y: v.y * scale + dy,
          z: v.z * scale + dz
        });
      }
      const tLen = mesh.triangles.length;
      for (let i = 0; i < tLen; i++) {
        const t = mesh.triangles[i];
        targetT.push({
          v1: t.v1 + vOffset,
          v2: t.v2 + vOffset,
          v3: t.v3 + vOffset
        });
      }
    };

    const scale = diceSize / 10;
    const spacing = 0.1;
    const offsetX = 125 - (gridWidth * (diceSize + spacing)) / 2;
    // Mirrored fix: We center on the bed. 
    // Usually Row 0 is at the "back" (Y+), but in canvas Row 0 is at the "top".
    const offsetY_TopEdge = 125 + (gridHeight * (diceSize + spacing)) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const face = diceLevels[y * gridWidth + x];
        if (face < 1 || face > 6) continue;

        // Position: 3MF beds usually have 0,0 at front-left. 250x250 bed center is 125,125.
        const posX = offsetX + x * (diceSize + spacing);
        const posY = offsetY_TopEdge - (y + 1) * (diceSize + spacing);

        // Add Body
        let bodyMesh;
        switch (face) {
          case 6: bodyMesh = geometries[7] ? geometries[7]["1"] : null; break;
          case 5: bodyMesh = geometries[8] ? geometries[8]["9"] : null; break;
          case 4: bodyMesh = geometries[9] ? geometries[9]["12"] : null; break;
          case 3: bodyMesh = geometries[10] ? geometries[10]["14"] : null; break;
          case 2: bodyMesh = geometries[11] ? geometries[11]["16"] : null; break;
          case 1: bodyMesh = geometries[12] ? geometries[12]["18"] : null; break;
        }
        if (bodyMesh) addMesh(bodyVertices, bodyTriangles, bodyMesh, posX, posY, 0, scale);

        // Add Pips
        const addPip = (gId, oId, px = 0, py = 0, pz = 0.8) => {
          if (geometries[gId] && geometries[gId][oId]) {
            addMesh(pipVertices, pipTriangles, geometries[gId][oId], posX + px * scale, posY + py * scale, pz * scale, scale);
          }
        };

        switch (face) {
          case 6:
            addPip(7, "2", 2.5, -2.5); addPip(7, "3", 0, -2.5); addPip(7, "4", -2.5, -2.5);
            addPip(7, "5", 2.5, 2.5); addPip(7, "6", 0, 2.5); addPip(7, "7", -2.5, 2.5);
            break;
          case 5:
            addPip(7, "2", 2.5, -2.5); addPip(7, "4", -2.5, -2.5); addPip(8, "10", 0, 0);
            addPip(7, "5", 2.5, 2.5); addPip(7, "7", -2.5, 2.5);
            break;
          case 4:
            addPip(7, "2", 2.5, -2.5); addPip(7, "4", -2.5, -2.5);
            addPip(7, "5", 2.5, 2.5); addPip(7, "7", -2.5, 2.5);
            break;
          case 3:
            addPip(7, "2", 2.5, -2.5); addPip(8, "10", 0, 0); addPip(7, "7", -2.5, 2.5);
            break;
          case 2:
            addPip(7, "2", 2.5, -2.5); addPip(7, "7", -2.5, 2.5);
            break;
          case 1:
            addPip(8, "10", 0, 0);
            break;
        }
      }
    }

    if (bodyVertices.length === 0) {
      console.error("No geometry generated!");
      throw new Error("Failed to generate geometry. Check template files.");
    }

    // 4. Create Final XML
    const serializeMesh = (vertices, triangles) => {
      let xmlArr = ['<mesh>\n<vertices>\n'];
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        xmlArr.push(`<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>\n`);
      }
      xmlArr.push('</vertices>\n<triangles>\n');
      for (let i = 0; i < triangles.length; i++) {
        const t = triangles[i];
        xmlArr.push(`<triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}"/>\n`);
      }
      xmlArr.push('</triangles>\n</mesh>');
      return xmlArr.join('');
    };

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <resources>
  <object id="1001" p:UUID="00000001-0000-4000-8000-000000000001" type="model" name="All_Bodies">
    ${serializeMesh(bodyVertices, bodyTriangles)}
  </object>
  <object id="1002" p:UUID="00000001-0000-4000-8000-000000000002" type="model" name="All_Pips">
    ${serializeMesh(pipVertices, pipTriangles)}
  </object>
 </resources>
 <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">
  <item objectid="1001" p:UUID="00000000-0000-4000-A000-000000000001" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>
  <item objectid="1002" p:UUID="00000000-0000-4000-B000-000000000002" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>
 </build>
</model>`;

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1001"><metadata key="name" value="All_Bodies"/><metadata key="extruder" value="2"/></object>
  <object id="1002"><metadata key="name" value="All_Pips"/><metadata key="extruder" value="1"/></object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Dice-Art"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    <model_instance><metadata key="object_id" value="1001"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1001"/></model_instance>
    <model_instance><metadata key="object_id" value="1002"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1002"/></model_instance>
  </plate>
</config>`;

    zip.file("3D/3dmodel.model", modelXML);
    zip.file("Metadata/model_settings.config", modelSettingsXML);

    const content = await zip.generateAsync({
      type: "blob",
      compression: "STORE"
    });
    console.timeEnd('3MF-Generation');
    return content;
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
