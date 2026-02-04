import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10) {
    console.log(`Generating optimized face-grouped 3MF (${diceSize}mm)...`);
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

    // 2. Define component helpers for exactly 6 master objects
    const getComponentsForFace = (face) => {
      const p7 = "/3D/Objects/object_7.model";
      const p8 = "/3D/Objects/object_8.model";
      const p9 = "/3D/Objects/object_9.model";
      const p10 = "/3D/Objects/object_10.model";
      const p11 = "/3D/Objects/object_11.model";
      const p12 = "/3D/Objects/object_12.model";

      const commonTransform = "1 0 0 0 1 0 0 0 1";
      const pipTransform = (x, y, z) => `${commonTransform} ${x} ${y} ${z}`;

      switch (face) {
        case 6:
          return `
    <component p:path="${p7}" objectid="1" p:UUID="00060000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p7}" objectid="2" p:UUID="00060000-0000-4000-8000-000000000002" transform="${pipTransform(2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="3" p:UUID="00060000-0000-4000-8000-000000000003" transform="${pipTransform(0, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="4" p:UUID="00060000-0000-4000-8000-000000000004" transform="${pipTransform(-2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="5" p:UUID="00060000-0000-4000-8000-000000000005" transform="${pipTransform(2.5, 2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="6" p:UUID="00060000-0000-4000-8000-000000000006" transform="${pipTransform(0, 2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="7" p:UUID="00060000-0000-4000-8000-000000000007" transform="${pipTransform(-2.5, 2.5, 0.8)}"/>`;
        case 5:
          return `
    <component p:path="${p8}" objectid="9" p:UUID="00050000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p7}" objectid="2" p:UUID="00050000-0000-4000-8000-000000000002" transform="${pipTransform(2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="4" p:UUID="00050000-0000-4000-8000-000000000003" transform="${pipTransform(-2.5, -2.5, 0.8)}"/>
    <component p:path="${p8}" objectid="10" p:UUID="00050000-0000-4000-8000-000000000004" transform="${pipTransform(0, 0, 0.8)}"/>
    <component p:path="${p7}" objectid="5" p:UUID="00050000-0000-4000-8000-000000000005" transform="${pipTransform(2.5, 2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="7" p:UUID="00050000-0000-4000-8000-000000000006" transform="${pipTransform(-2.5, 2.5, 0.8)}"/>`;
        case 4:
          return `
    <component p:path="${p9}" objectid="12" p:UUID="00040000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p7}" objectid="2" p:UUID="00040000-0000-4000-8000-000000000002" transform="${pipTransform(2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="4" p:UUID="00040000-0000-4000-8000-000000000003" transform="${pipTransform(-2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="5" p:UUID="00040000-0000-4000-8000-000000000004" transform="${pipTransform(2.5, 2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="7" p:UUID="00040000-0000-4000-8000-000000000005" transform="${pipTransform(-2.5, 2.5, 0.8)}"/>`;
        case 3:
          return `
    <component p:path="${p10}" objectid="14" p:UUID="00030000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p7}" objectid="2" p:UUID="00030000-0000-4000-8000-000000000002" transform="${pipTransform(2.5, -2.5, 0.8)}"/>
    <component p:path="${p8}" objectid="10" p:UUID="00030000-0000-4000-8000-000000000003" transform="${pipTransform(0, 0, 0.8)}"/>
    <component p:path="${p7}" objectid="7" p:UUID="00030000-0000-4000-8000-000000000004" transform="${pipTransform(-2.5, 2.5, 0.8)}"/>`;
        case 2:
          return `
    <component p:path="${p11}" objectid="16" p:UUID="00020000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p7}" objectid="2" p:UUID="00020000-0000-4000-8000-000000000002" transform="${pipTransform(2.5, -2.5, 0.8)}"/>
    <component p:path="${p7}" objectid="7" p:UUID="00020000-0000-4000-8000-000000000003" transform="${pipTransform(-2.5, 2.5, 0.8)}"/>`;
        case 1:
          return `
    <component p:path="${p12}" objectid="18" p:UUID="00010000-0000-4000-8000-000000000001" transform="${commonTransform} 0 0 0"/>
    <component p:path="${p8}" objectid="10" p:UUID="00010000-0000-4000-8000-000000000002" transform="${pipTransform(0, 0, 0.8)}"/>`;
        default: return "";
      }
    };

    const getPartMeta = (face) => {
      const getPart = (pid, name, extr, sfile, sid, x = 0, y = 0, z = 0) => {
        const matrix = `1 0 0 ${x} 0 1 0 ${y} 0 0 1 ${z} 0 0 0 1`;
        return `<part id="${pid}" subtype="normal_part">
      <metadata key="name" value="${name}"/>
      <metadata key="matrix" value="${matrix}"/>
      <metadata key="source_file" value="${sfile}"/>
      <metadata key="source_object_id" value="${sid}"/>
      <metadata key="source_volume_id" value="0"/>
      <metadata key="extruder" value="${extr}"/>
    </part>`;
      };

      const p7 = "object_7.model";
      const p8 = "object_8.model";
      const p9 = "object_9.model";
      const p10 = "object_10.model";
      const p11 = "object_11.model";
      const p12 = "object_12.model";

      switch (face) {
        case 6:
          return `
    <metadata key="name" value="6"/><metadata key="extruder" value="1"/>
    ${getPart(1, "Body", 2, p7, 1)}
    ${getPart(2, "Pip", 1, p7, 2, 2.5, -2.5, 0.8)}
    ${getPart(3, "Pip", 1, p7, 3, 0, -2.5, 0.8)}
    ${getPart(4, "Pip", 1, p7, 4, -2.5, -2.5, 0.8)}
    ${getPart(5, "Pip", 1, p7, 5, 2.5, 2.5, 0.8)}
    ${getPart(6, "Pip", 1, p7, 6, 0, 2.5, 0.8)}
    ${getPart(7, "Pip", 1, p7, 7, -2.5, 2.5, 0.8)}`;
        case 5:
          return `
    <metadata key="name" value="5"/><metadata key="extruder" value="1"/>
    ${getPart(9, "Body", 2, p8, 9)}
    ${getPart(2, "Pip", 1, p7, 2, 2.5, -2.5, 0.8)}
    ${getPart(4, "Pip", 1, p7, 4, -2.5, -2.5, 0.8)}
    ${getPart(10, "Pip", 1, p8, 10, 0, 0, 0.8)}
    ${getPart(5, "Pip", 1, p7, 5, 2.5, 2.5, 0.8)}
    ${getPart(7, "Pip", 1, p7, 7, -2.5, 2.5, 0.8)}`;
        case 4:
          return `
    <metadata key="name" value="4"/><metadata key="extruder" value="1"/>
    ${getPart(12, "Body", 2, p9, 12)}
    ${getPart(2, "Pip", 1, p7, 2, 2.5, -2.5, 0.8)}
    ${getPart(4, "Pip", 1, p7, 4, -2.5, -2.5, 0.8)}
    ${getPart(5, "Pip", 1, p7, 5, 2.5, 2.5, 0.8)}
    ${getPart(7, "Pip", 1, p7, 7, -2.5, 2.5, 0.8)}`;
        case 3:
          return `
    <metadata key="name" value="3"/><metadata key="extruder" value="1"/>
    ${getPart(14, "Body", 2, p10, 14)}
    ${getPart(2, "Pip", 1, p7, 2, 2.5, -2.5, 0.8)}
    ${getPart(10, "Pip", 1, p8, 10, 0, 0, 0.8)}
    ${getPart(7, "Pip", 1, p7, 7, -2.5, 2.5, 0.8)}`;
        case 2:
          return `
    <metadata key="name" value="2"/><metadata key="extruder" value="1"/>
    ${getPart(16, "Body", 2, p11, 16)}
    ${getPart(2, "Pip", 1, p7, 2, 2.5, -2.5, 0.8)}
    ${getPart(7, "Pip", 1, p7, 7, -2.5, 2.5, 0.8)}`;
        case 1:
          return `
    <metadata key="name" value="1"/><metadata key="extruder" value="1"/>
    ${getPart(18, "Body", 2, p12, 18)}
    ${getPart(10, "Pip", 1, p8, 10, 0, 0, 0.8)}`;
        default: return "";
      }
    };

    // 3. Define the 6 master objects
    let resourcesXML = "";
    for (let face = 1; face <= 6; face++) {
      resourcesXML += `
  <object id="${face}" p:UUID="00000000-0000-4000-8000-00000000000${face}" type="model">
   <components>${getComponentsForFace(face)}
   </components>
  </object>`;
    }

    // 4. Grid Loop: Use items referencing the 6 master objects
    let buildItemsXML = "";
    let plateInstancesXML = "";
    const faceInstanceCounters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const scale = diceSize / 10;
    const spacing = 0.1;
    const offsetX = 125 - (gridWidth * (diceSize + spacing)) / 2;
    const offsetY = 125 - (gridHeight * (diceSize + spacing)) / 2;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;
        const face = diceLevels[index];
        if (face < 1 || face > 6) continue;

        const instId = faceInstanceCounters[face];
        faceInstanceCounters[face]++;

        const posX = offsetX + x * (diceSize + spacing);
        const posY = offsetY + y * (diceSize + spacing);
        const transform = `${scale} 0 0 0 ${scale} 0 0 0 ${scale} ${posX} ${posY} 0`;
        const itemUUID = `00000000-0000-4000-9000-${index.toString(16).padStart(12, '0')}`;

        buildItemsXML += `<item objectid="${face}" p:UUID="${itemUUID}" transform="${transform}" printable="1"/>\n  `;

        plateInstancesXML += `
    <model_instance>
      <metadata key="object_id" value="${face}"/>
      <metadata key="instance_id" value="${instId}"/>
      <metadata key="identify_id" value="${1000 + index}"/>
    </model_instance>`;
      }
    }

    // 5. Model Settings Objects: Just 6 entries
    let modelSettingsObjectsXML = "";
    for (let face = 1; face <= 6; face++) {
      modelSettingsObjectsXML += `
  <object id="${face}">${getPartMeta(face)}
  </object>`;
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
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });
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
