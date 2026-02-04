import JSZip from 'jszip';

export default class Exporter3MF {
  constructor() {
    this.templatePath = '/3mf-template/';
  }

  async generateSinglePlate3MF(diceLevels, gridWidth, gridHeight, diceSize = 10) {
    console.log(`Generating robust 3MF (${diceSize}mm)...`);
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

    const dieObjectMapping = {
      1: 19, 2: 17, 3: 15, 4: 13, 5: 11, 6: 8
    };

    // 2. Build items and metadata
    let buildItemsXML = "";
    let plateInstancesXML = "";
    let assembleXML = "";

    const scale = diceSize / 10;
    const spacing = 0.1;
    const objectInstanceCounters = { 8: 0, 11: 0, 13: 0, 15: 0, 17: 0, 19: 0 };

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const index = y * gridWidth + x;
        const face = diceLevels[index];
        if (face < 1 || face > 6) continue;

        const objId = dieObjectMapping[face];
        const instId = objectInstanceCounters[objId];
        objectInstanceCounters[objId]++;

        // Position calculation
        const posX = x * (diceSize + spacing);
        const posY = y * (diceSize + spacing);
        const posZ = 1;

        const transform = `${scale} 0 0 0 ${scale} 0 0 0 ${scale} ${posX} ${posY} ${posZ}`;
        const uuid = `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

        buildItemsXML += `<item objectid="${objId}" p:UUID="${uuid}" transform="${transform}" printable="1"/>\n  `;
        assembleXML += `<assemble_item object_id="${objId}" instance_id="${instId}" transform="${transform}" offset="0 0 0" />\n   `;

        plateInstancesXML += `
    <model_instance>
      <metadata key="object_id" value="${objId}"/>
      <metadata key="instance_id" value="${instId}"/>
      <metadata key="identify_id" value="${20000 + index}"/>
    </model_instance>`;
      }
    }

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <resources>
  <object id="8" p:UUID="00000007-61cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_7.model" objectid="1" p:UUID="00070000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_7.model" objectid="2" p:UUID="00070001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="3" p:UUID="00070002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="4" p:UUID="00070003-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="5" p:UUID="00070004-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="6" p:UUID="00070005-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="7" p:UUID="00070006-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 2.5 0.8"/>
   </components>
  </object>
  <object id="11" p:UUID="00000008-71cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_8.model" objectid="9" p:UUID="00080000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_7.model" objectid="2" p:UUID="00080001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="4" p:UUID="00080002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_8.model" objectid="10" p:UUID="00080003-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="5" p:UUID="00080004-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="7" p:UUID="00080005-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 2.5 0.8"/>
   </components>
  </object>
  <object id="13" p:UUID="00000009-71cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_9.model" objectid="12" p:UUID="00090000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_7.model" objectid="2" p:UUID="00090001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="4" p:UUID="00090002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="5" p:UUID="00090003-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="7" p:UUID="00090004-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 2.5 0.8"/>
   </components>
  </object>
  <object id="15" p:UUID="0000000a-71cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_10.model" objectid="14" p:UUID="000a0000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_7.model" objectid="2" p:UUID="000a0001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_8.model" objectid="10" p:UUID="000a0002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="7" p:UUID="000a0003-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 2.5 0.8"/>
   </components>
  </object>
  <object id="17" p:UUID="0000000b-71cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_11.model" objectid="16" p:UUID="000b0000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_7.model" objectid="2" p:UUID="000b0001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 2.5 -2.5 0.8"/>
    <component p:path="/3D/Objects/object_7.model" objectid="7" p:UUID="000b0002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 -2.5 2.5 0.8"/>
   </components>
  </object>
  <object id="19" p:UUID="0000000c-71cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component p:path="/3D/Objects/object_12.model" objectid="18" p:UUID="000c0000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component p:path="/3D/Objects/object_8.model" objectid="10" p:UUID="000c0001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0.8"/>
   </components>
  </object>
 </resources>
 <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">
  ${buildItemsXML}
 </build>
</model>`;

    zip.file("3D/3dmodel.model", modelXML);

    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="8">
    <metadata key="name" value="6"/><metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="3" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="6" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <object id="11">
    <metadata key="name" value="5"/><metadata key="extruder" value="1"/>
    <part id="9" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <object id="13">
    <metadata key="name" value="4"/><metadata key="extruder" value="1"/>
    <part id="12" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <object id="15">
    <metadata key="name" value="3"/><metadata key="extruder" value="1"/>
    <part id="14" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <object id="17">
    <metadata key="name" value="2"/><metadata key="extruder" value="1"/>
    <part id="16" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <object id="19">
    <metadata key="name" value="1"/><metadata key="extruder" value="1"/>
    <part id="18" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/></part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="Dice-Art"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    ${plateInstancesXML}
  </plate>
  <assemble>
   ${assembleXML}
  </assemble>
</config>`;

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
