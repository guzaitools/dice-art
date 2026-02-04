import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10) {
    console.time('3MF-Generation');
    console.log(`Generating mesh-merged 3MF (${diceSize}mm)...`);
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

    // 2. Mesh Parser Utility
    const parseMesh = (xml) => {
      const vertices = [];
      const triangles = [];

      // Basic regex parsing for speed & simplicity in browser
      const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
      const tRegex = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;

      let match;
      while ((match = vRegex.exec(xml)) !== null) {
        vertices.push({ x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]) });
      }
      while ((match = tRegex.exec(xml)) !== null) {
        triangles.push({ v1: parseInt(match[1]), v2: parseInt(match[2]), v3: parseInt(match[3]) });
      }
      return { vertices, triangles };
    };

    // Cache parsed meshes for the 6 faces
    const p7 = "/3D/Objects/object_7.model";
    const p8 = "/3D/Objects/object_8.model";
    const p9 = "/3D/Objects/object_9.model";
    const p10 = "/3D/Objects/object_10.model";
    const p11 = "/3D/Objects/object_11.model";
    const p12 = "/3D/Objects/object_12.model";

    // Sub-object IDs inside the template models
    // object_7: Body=1, Pips=[2,3,4,5,6,7]
    // object_8: Body=9, PipCenter=10
    // object_9: Body=12
    // object_10: Body=14
    // object_11: Body=16
    // object_12: Body=18

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

    const geometries = {
      7: splitModelGeometries(modelModels['3D/Objects/object_7.model']),
      8: splitModelGeometries(modelModels['3D/Objects/object_8.model']),
      9: splitModelGeometries(modelModels['3D/Objects/object_9.model']),
      10: splitModelGeometries(modelModels['3D/Objects/object_10.model']),
      11: splitModelGeometries(modelModels['3D/Objects/object_11.model']),
      12: splitModelGeometries(modelModels['3D/Objects/object_12.model']),
    };

    // 3. Merging Logic
    const bodyVertices = [];
    const bodyTriangles = [];
    const pipVertices = [];
    const pipTriangles = [];

    const addMesh = (targetV, targetT, mesh, dx, dy, dz, scale) => {
      const vOffset = targetV.length;
      for (const v of mesh.vertices) {
        targetV.push({
          x: v.x * scale + dx,
          y: v.y * scale + dy,
          z: v.z * scale + dz
        });
      }
      for (const t of mesh.triangles) {
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
    // Fix flipping: Canvas Y to 3D Y mapping
    // Slicer Y increases towards "back". Canvas Y increases "down".
    // Traditionally, we want row 0 at the "top" (highest Y in slicer).
    const offsetY_Total = 125 + (gridHeight * (diceSize + spacing)) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const face = diceLevels[y * gridWidth + x];
        if (face < 1 || face > 6) continue;

        const posX = offsetX + x * (diceSize + spacing);
        const posY = offsetY_Total - (y + 1) * (diceSize + spacing); // Flip fix

        // Add Body
        let bodyMesh;
        switch (face) {
          case 6: bodyMesh = geometries[7]["1"]; break;
          case 5: bodyMesh = geometries[8]["9"]; break;
          case 4: bodyMesh = geometries[9]["12"]; break;
          case 3: bodyMesh = geometries[10]["14"]; break;
          case 2: bodyMesh = geometries[11]["16"]; break;
          case 1: bodyMesh = geometries[12]["18"]; break;
        }
        addMesh(bodyVertices, bodyTriangles, bodyMesh, posX, posY, 0, scale);

        // Add Pips
        const addPip = (gId, oId, px = 0, py = 0, pz = 0.8) => {
          addMesh(pipVertices, pipTriangles, geometries[gId][oId], posX + px * scale, posY + py * scale, pz * scale, scale);
        };

        switch (face) {
          case 6: // Pips 2,3,4,5,6,7 from obj 7
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

    // 4. Create Final XML
    const serializeMesh = (vertices, triangles) => {
      let xml = '<mesh>\n<vertices>\n';
      // Optimization: batch string construction
      const vArr = vertices.map(v => `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>`);
      xml += vArr.join('\n') + '\n</vertices>\n<triangles>\n';
      const tArr = triangles.map(t => `<triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}"/>`);
      xml += tArr.join('\n') + '\n</triangles>\n</mesh>';
      return xml;
    };

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <resources>
  <object id="1" type="model" name="All_Bodies">
    ${serializeMesh(bodyVertices, bodyTriangles)}
  </object>
  <object id="2" type="model" name="All_Pips">
    ${serializeMesh(pipVertices, pipTriangles)}
  </object>
 </resources>
 <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">
  <item objectid="1" p:UUID="00000000-0000-4000-A000-000000000001" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>
  <item objectid="2" p:UUID="00000000-0000-4000-B000-000000000002" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1"/>
 </build>
</model>`;

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1"><metadata key="name" value="All_Bodies"/><metadata key="extruder" value="2"/></object>
  <object id="2"><metadata key="name" value="All_Pips"/><metadata key="extruder" value="1"/></object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Dice-Art"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    <model_instance><metadata key="object_id" value="1"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="1"/></model_instance>
    <model_instance><metadata key="object_id" value="2"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="2"/></model_instance>
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
