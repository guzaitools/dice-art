import JSZip from 'jszip';

export default class Exporter3MF {
    constructor() {
        this.templatePath = '/3mf-template/';
    }

    async generate3MF(diceLevels, gridWidth, gridHeight) {
        console.log("Generating 3MF for grid:", gridWidth, "x", gridHeight);

        const zip = new JSZip();

        // 1. Core Files list to fetch from template
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
            "Metadata/model_settings.config",
            "Metadata/cut_information.xml",
            "Metadata/slice_info.config",
            "Metadata/filament_sequence.json"
        ];

        // Fetch and add to zip
        const fetchPromises = templateFiles.map(async (file) => {
            try {
                const response = await fetch(`${this.templatePath}${file}`);
                if (response.ok) {
                    const blob = await response.blob();
                    zip.file(file, blob);
                } else {
                    console.error(`Failed to fetch template file: ${file}, status: ${response.status}`);
                }
            } catch (err) {
                console.error(`Error fetching ${file}:`, err);
            }
        });

        await Promise.all(fetchPromises);

        // 2. Define Object Mappings (from Dado Falso - Tope.3mf reference)
        // Die Face Level (1-6) mapping to Object IDs in 3dmodel.model
        const dieObjectMapping = {
            1: 8,
            2: 11,
            3: 13,
            4: 15,
            5: 17,
            6: 19
        };

        // 3. Generate the assembly Model XML
        const itemsXML = this.generateBuildItems(diceLevels, gridWidth, gridHeight, dieObjectMapping);

        const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
 <metadata name="Application">Dice Art Evolution Engine</metadata>
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
  ${itemsXML}
 </build>
</model>`;

        zip.file("3D/3dmodel.model", modelXML);

        // 4. Generate the package
        const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });
        return content;
    }

    generateBuildItems(diceLevels, gridWidth, gridHeight, dieMapping) {
        let itemsXML = "";
        const diceSize = 10;
        const spacing = 2; // Add some spacing between the samples

        // Find unique die levels present in the current result
        const uniqueLevels = [...new Set(diceLevels)].sort((a, b) => a - b);

        uniqueLevels.forEach((level, index) => {
            const dieLevel = level + 1; // 1 to 6
            const objectId = dieMapping[dieLevel];

            // Arrange them in a row for the sample set
            const x = 90 + index * (diceSize + spacing);
            const y = 90;
            const z = 1;

            const uuid = `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
            const transform = `1 0 0 0 1 0 0 0 1 ${x} ${y} ${z}`;

            itemsXML += `<item objectid="${objectId}" p:UUID="${uuid}" transform="${transform}" printable="1"/>\n  `;
        });
        return itemsXML;
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
