export default class Preview3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.geometries = {};
        this.materials = {
            body: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.5 }),
            pip: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.8, emissive: 0x333333 })
        };
        this.templatePath = '/3mf-template/';
    }

    async init() {
        if (this.scene) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050208);

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
        this.camera.position.set(200, 200, 400);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(200, 500, 300);
        this.scene.add(mainLight);

        const fillLight = new THREE.PointLight(0x8c23f4, 2, 1000);
        fillLight.position.set(-200, 100, 200);
        this.scene.add(fillLight);

        await this.loadTemplates();
        this.animate();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async loadTemplates() {
        const files = [7, 8, 9, 10, 11, 12];
        const fetchPromises = files.map(async (f) => {
            const resp = await fetch(`${this.templatePath}3D/Objects/object_${f}.model`);
            const xml = await resp.text();
            this.geometries[f] = this.parseModel(xml);
        });
        await Promise.all(fetchPromises);
    }

    parseModel(xml) {
        const objects = {};
        const objBlocks = xml.split(/<object/);
        objBlocks.shift();
        for (const block of objBlocks) {
            const idMatch = block.match(/id="([^"]+)"/);
            if (idMatch) {
                const vertices = [];
                const indices = [];
                const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
                const tRegex = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;
                let m;
                while ((m = vRegex.exec(block)) !== null) vertices.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
                while ((m = tRegex.exec(block)) !== null) indices.push(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));

                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geo.setIndex(indices);
                geo.computeVertexNormals();
                objects[idMatch[1]] = geo;
            }
        }
        return objects;
    }

    update(diceLevels, gridWidth, gridHeight, diceSize = 10, spacing = true) {
        // Clear previous
        while (this.scene.children.length > 3) { // Keep lights
            const child = this.scene.children[3];
            if (child.isMesh) {
                // We don't dispose geometries here because they are cached in this.geometries
            }
            this.scene.remove(child);
        }

        const s = diceSize / 10;
        const step = diceSize + (spacing ? 0.4 : 0);
        const ox = -(gridWidth * step) / 2;
        const oy = (gridHeight * step) / 2;

        const bodyGroup = new THREE.Group();
        const pipGroup = new THREE.Group();

        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const face = diceLevels[y * gridWidth + x];
                if (face < 1 || face > 6) continue;

                const px = ox + x * step;
                const py = oy - (y + 1) * step;

                let bm;
                switch (face) {
                    case 6: bm = this.geometries[7]["1"]; break;
                    case 5: bm = this.geometries[8]["9"]; break;
                    case 4: bm = this.geometries[9]["12"]; break;
                    case 3: bm = this.geometries[10]["14"]; break;
                    case 2: bm = this.geometries[11]["16"]; break;
                    case 1: bm = this.geometries[12]["18"]; break;
                }

                if (bm) {
                    const mesh = new THREE.Mesh(bm, this.materials.body);
                    mesh.position.set(px, py, 0);
                    mesh.scale.set(s, s, s);
                    bodyGroup.add(mesh);
                }

                const addP = (g, o, dx, dy) => {
                    const geo = this.geometries[g][o];
                    if (!geo) return;
                    const mesh = new THREE.Mesh(geo, this.materials.pip);
                    mesh.position.set(px + dx * s, py + dy * s, 0.8 * s);
                    mesh.scale.set(s, s, s);
                    pipGroup.add(mesh);
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

        this.scene.add(bodyGroup);
        this.scene.add(pipGroup);

        // Zoom to fit
        const box = new THREE.Box3().setFromObject(bodyGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Offset
        this.camera.position.set(center.x, center.y, cameraZ);
        this.controls.target.copy(center);
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }
}
