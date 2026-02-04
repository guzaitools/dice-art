import JSZip from 'jszip';

export default class Exporter3MF {
    constructor() {
        this.templatePath = '/3mf-template/';
    }

    async generate3MF(diceLevels, gridWidth, gridHeight) {
        console.log("Generating final multi-plate 3MF project...");

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

        // 2. Logic: Group dice by face (1-6)
        const counts = new Array(7).fill(0);
        diceLevels.forEach(lvl => {
            if (lvl >= 1 && lvl <= 6) {
                counts[lvl]++;
            }
        });

        const dieObjectMapping = {
            1: 19, 2: 17, 3: 15, 4: 13, 5: 11, 6: 8
        };

        const optimizedPlates = [];
        for (let face = 1; face <= 6; face++) {
            const total = counts[face];
            if (total === 0) continue;

            const fullSets = Math.floor(total / 100);
            const remainder = total % 100;

            if (fullSets > 0) {
                optimizedPlates.push({
                    face,
                    count: 100,
                    name: `Dice #${face} - ${fullSets} Prints`,
                    objectId: dieObjectMapping[face]
                });
            }
            if (remainder > 0) {
                optimizedPlates.push({
                    face,
                    count: remainder,
                    name: `Dice #${face} - Remainder (${remainder})`,
                    objectId: dieObjectMapping[face]
                });
            }
        }

        // 3. Generate XML Content
        let buildItemsXML = "";
        let platesXML = "";
        let assembleXML = "";
        const objectInstanceCounters = { 8: 0, 11: 0, 13: 0, 15: 0, 17: 0, 19: 0 };

        // SPATIAL STRATEGY: Offset plates by 250mm to trigger plate separation.
        const plateSpacingX = 250;
        const platesPerRow = 2; // Keep it compact (2x3 or 2xN)

        optimizedPlates.forEach((plate, pIdx) => {
            const platerId = pIdx + 1;
            let plateInstancesXML = "";

            // Absolute world coordinates for this physical plate
            const plateOriginX = (pIdx % platesPerRow) * plateSpacingX;
            const plateOriginY = Math.floor(pIdx / platesPerRow) * plateSpacingX;

            const cols = 10;
            const size = 10;
            const spacing = 2;

            for (let i = 0; i < plate.count; i++) {
                const objId = plate.objectId;
                const instId = objectInstanceCounters[objId];
                objectInstanceCounters[objId]++;

                const col = i % cols;
                const row = Math.floor(i / cols);

                // Position relative to plate origin (centered roughly at 50,50 within the 250x250 slot)
                const x = plateOriginX + 50 + col * (size + spacing);
                const y = plateOriginY + 50 + row * (size + spacing);
                const z = 1;

                const transform = `1 0 0 0 1 0 0 0 1 ${x} ${y} ${z}`;
                const uuid = `00000000-0000-4000-8000-${platerId.toString(16).padStart(4, '0')}${i.toString(16).padStart(8, '0')}`;

                buildItemsXML += `<item objectid="${objId}" p:UUID="${uuid}" transform="${transform}" printable="1"/>\n  `;
                assembleXML += `<assemble_item object_id="${objId}" instance_id="${instId}" transform="${transform}" offset="0 0 0" />\n   `;

                plateInstancesXML += `
    <model_instance>
      <metadata key="object_id" value="${objId}"/>
      <metadata key="instance_id" value="${instId}"/>
      <metadata key="identify_id" value="${10000 + platerId * 1000 + i}"/>
    </model_instance>`;
            }

            platesXML += `<plate>
    <metadata key="plater_id" value="${platerId}"/>
    <metadata key="plater_name" value="${plate.name}"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    ${plateInstancesXML}
  </plate>\n`;
        });

        // 4. Model Resources (Ensuring correct object IDs and Z height)
        const masterModel = `<?xml version="1.0" encoding="UTF-8"?>
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

        zip.file("3D/3dmodel.model", masterModel);

        // 5. Construct Metadata/model_settings.config
        // Replicating EXACT parts hierarchy with source_object/volume/file metadata
        const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="8">
    <metadata key="name" value="6"/><metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="3" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 0 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="6" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 0 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  <object id="11">
    <metadata key="name" value="5"/><metadata key="extruder" value="1"/>
    <part id="9" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0.8 0 0 0 1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  <object id="13">
    <metadata key="name" value="4"/><metadata key="extruder" value="1"/>
    <part id="12" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="4" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="5" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  <object id="15">
    <metadata key="name" value="3"/><metadata key="extruder" value="1"/>
    <part id="14" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0.8 0 0 0 1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  <object id="17">
    <metadata key="name" value="2"/><metadata key="extruder" value="1"/>
    <part id="16" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 2.5 0 1 0 -2.5 0 0 1 0.8 0 0 0 1"/></part>
    <part id="7" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 -2.5 0 1 0 2.5 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  <object id="19">
    <metadata key="name" value="1"/><metadata key="extruder" value="1"/>
    <part id="18" subtype="normal_part"><metadata key="name" value="Body"/><metadata key="extruder" value="2"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>
    <part id="10" subtype="normal_part"><metadata key="name" value="Pip"/><metadata key="extruder" value="1"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0.8 0 0 0 1"/></part>
  </object>
  ${platesXML}
  <assemble>
   ${assembleXML}
  </assemble>
</config>`;

        zip.file("Metadata/model_settings.config", modelSettingsXML);

        // 6. Finalize ZIP
        const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });
        return content;
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
