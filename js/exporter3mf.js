import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10) {
    console.time('3MF-Generation');
    console.log(`Generating super-optimized 12-group 3MF (${diceSize}mm)...`);
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

    const fetchPromises = templateFiles.map(async (file) => {
      try {
        const response = await fetch(`${this.templatePath}${file}`);
        if (response.ok) {
          const blob = await response.blob();
          zip.file(file, blob);
        }
      } catch (err) {
        console.error(`Error fetching template file ${file}:`, err);
      }
    });
    await Promise.all(fetchPromises);

    // 2. Define geometry source mapping (from reference investigation)
    // Body source objects - These are the raw mesh IDs in the respective .model files
    const bodySources = {
      6: { path: "/3D/Objects/object_7.model", id: 1 },
      5: { path: "/3D/Objects/object_8.model", id: 9 },
      4: { path: "/3D/Objects/object_9.model", id: 12 },
      3: { path: "/3D/Objects/object_10.model", id: 14 },
      2: { path: "/3D/Objects/object_11.model", id: 16 },
      1: { path: "/3D/Objects/object_12.model", id: 18 }
    };

    // Pip source objects - Using geometry IDs found in previous investigation
    // Face 6: pips 2,3,4,5,6,7 from object_7
    // Face 5: pips 2,4 from object_7, 10 from object_8, 5,7 from object_7
    // Face 4: pips 2,4,5,7 from object_7
    // Face 3: pips 2 from object_7, 10 from object_8, 7 from object_7
    // Face 2: pips 2,7 from object_7
    // Face 1: pips 10 from object_8

    const getPipComponentsForFace = (face, groupUUIDBase) => {
      const p7 = "/3D/Objects/object_7.model";
      const p8 = "/3D/Objects/object_8.model";
      const t = (x, y, z) => `1 0 0 0 1 0 0 0 1 ${x} ${y} ${z}`;
      const c = (path, id, sub, transform) => `<component p:path="${path}" objectid="${id}" p:UUID="${groupUUIDBase}${sub}" transform="${transform}"/>`;

      switch (face) {
        case 6: return [
          c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 3, "03", t(0, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)),
          c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 6, "06", t(0, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))
        ].join('');
        case 5: return [
          c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)), c(p8, 10, "10", t(0, 0, 0.8)),
          c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))
        ].join('');
        case 4: return [
          c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)),
          c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))
        ].join('');
        case 3: return [
          c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p8, 10, "10", t(0, 0, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))
        ].join('');
        case 2: return [
          c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))
        ].join('');
        case 1: return [
          c(p8, 10, "10", t(0, 0, 0.8))
        ].join('');
        default: return "";
      }
    };

    // 3. Populate groups per face type
    const bodiesByFace = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const pipsByFace = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    const scale = diceSize / 10;
    const spacing = 0.1;
    const offsetX = 125 - (gridWidth * (diceSize + spacing)) / 2;
    const offsetY = 125 - (gridHeight * (diceSize + spacing)) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;
        const face = diceLevels[index];
        if (face < 1 || face > 6) continue;

        const posX = offsetX + x * (diceSize + spacing);
        const posY = offsetY + y * (diceSize + spacing);
        const transform = `1 0 0 0 1 0 0 0 1 ${posX / scale} ${posY / scale} 0`;
        const uuidSuffix = index.toString(16).padStart(8, '0');

        // Add body component
        bodiesByFace[face].push(
          `<component p:path="${bodySources[face].path}" objectid="${bodySources[face].id}" p:UUID="0000B000-0000-4000-8000-${uuidSuffix}" transform="${transform}"/>`
        );

        // Add pip components (pre-positioned relative to the body in its own group)
        // Note: The pips inside the face-pip-group are already offset by posX,posY
        const pips = getPipComponentsForFace(face, `0000P000-0000-4000-8000-${uuidSuffix}`);
        pipsByFace[face].push(`<object p:UUID="0000G000-0000-4000-8000-${uuidSuffix}" transform="${transform}">${pips}</object>`);
      }
    }

    // 4. Generate the 12 master resource objects
    let resourcesXML = "";
    let buildItemsXML = "";
    let plateInstancesXML = "";
    let modelSettingsObjectsXML = "";

    const commonScaleTransform = `${scale} 0 0 0 ${scale} 0 0 0 ${scale} 0 0 0`;

    for (let face = 1; face <= 6; face++) {
      const bodyGroupId = 100 + face;
      const pipGroupId = 200 + face;

      // Bodies Group
      resourcesXML += `
  <object id="${bodyGroupId}" p:UUID="00000B00-0000-4000-8000-00000000000${face}" type="model">
    <components>
      ${bodiesByFace[face].join('\n      ')}
    </components>
  </object>`;

      // Pips Group - Standard 3MF doesn't support <object> inside <components> directly usually,
      // but we can just use the components directly from the pip helper but adding the posX/posY offset
      // Wait, let's optimize: build the pip components list with the absolute grid positions
      let pipComponentsForGroup = [];
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const index = y * gridWidth + x;
          if (diceLevels[index] !== face) continue;

          const posX = offsetX + x * (diceSize + spacing);
          const posY = offsetY + y * (diceSize + spacing);
          const uuidSuffix = index.toString(16).padStart(8, '0');

          const p7 = "/3D/Objects/object_7.model";
          const p8 = "/3D/Objects/object_8.model";
          const t = (ox, oy, oz) => `1 0 0 0 1 0 0 0 1 ${(posX + ox * scale) / scale} ${(posY + oy * scale) / scale} ${oz}`;
          const c = (path, id, sub, transform) => `<component p:path="${path}" objectid="${id}" p:UUID="0000P000-0000-4000-8000-${uuidSuffix}${sub}" transform="${transform}"/>`;

          switch (face) {
            case 6: pipComponentsForGroup.push(c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 3, "03", t(0, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)), c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 6, "06", t(0, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))); break;
            case 5: pipComponentsForGroup.push(c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)), c(p8, 10, "10", t(0, 0, 0.8)), c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))); break;
            case 4: pipComponentsForGroup.push(c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 4, "04", t(-2.5, -2.5, 0.8)), c(p7, 5, "05", t(2.5, 2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))); break;
            case 3: pipComponentsForGroup.push(c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p8, 10, "10", t(0, 0, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))); break;
            case 2: pipComponentsForGroup.push(c(p7, 2, "02", t(2.5, -2.5, 0.8)), c(p7, 7, "07", t(-2.5, 2.5, 0.8))); break;
            case 1: pipComponentsForGroup.push(c(p8, 10, "10", t(0, 0, 0.8))); break;
          }
        }
      }

      resourcesXML += `
  <object id="${pipGroupId}" p:UUID="00000P00-0000-4000-8000-00000000000${face}" type="model">
    <components>
      ${pipComponentsForGroup.join('\n      ')}
    </components>
  </object>`;

      // Build Items (just 12)
      buildItemsXML += `<item objectid="${bodyGroupId}" p:UUID="00000000-0000-4000-A000-00000000000${face}" transform="${commonScaleTransform}" printable="1"/>\n  `;
      buildItemsXML += `<item objectid="${pipGroupId}" p:UUID="00000000-0000-4000-B000-00000000000${face}" transform="${commonScaleTransform}" printable="1"/>\n  `;

      // Plate Instances
      plateInstancesXML += `
    <model_instance>
      <metadata key="object_id" value="${bodyGroupId}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${100 + face}"/>
    </model_instance>
    <model_instance>
      <metadata key="object_id" value="${pipGroupId}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${200 + face}"/>
    </model_instance>`;

      // Metadata mappings
      modelSettingsObjectsXML += `
  <object id="${bodyGroupId}"><metadata key="name" value="Bodies-Face-${face}"/><metadata key="extruder" value="2"/></object>
  <object id="${pipGroupId}"><metadata key="name" value="Pips-Face-${face}"/><metadata key="extruder" value="1"/></object>`;
    }

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <resources>${resourcesXML}
 </resources>
 <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">
  ${buildItemsXML}
 </build>
</model>`;

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>${modelSettingsObjectsXML}
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Dice-Art"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    ${plateInstancesXML}
  </plate>
</config>`;

    zip.file("3D/3dmodel.model", modelXML);
    zip.file("Metadata/model_settings.config", modelSettingsXML);

    const content = await zip.generateAsync({
      type: "blob",
      compression: "STORE", // No compression for speed
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
