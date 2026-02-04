export default class Preview3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.textures = {};
        this.boxGeometry = new THREE.BoxGeometry(10, 10, 10);
        this.textureLoader = new THREE.TextureLoader();
    }

    async init() {
        if (this.scene) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050208);

        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        this.camera.position.set(300, 300, 600);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(500, 1000, 750);
        this.scene.add(mainLight);

        const rimLight = new THREE.PointLight(0x8c23f4, 1.5, 2000);
        rimLight.position.set(-500, 500, 500);
        this.scene.add(rimLight);

        await this.loadTextures();
        this.animate();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async loadTextures() {
        const promises = [];
        for (let i = 1; i <= 6; i++) {
            promises.push(new Promise((resolve) => {
                this.textureLoader.load(`assets/dice/dice-${i}.png`, (tex) => {
                    this.textures[i] = tex;
                    resolve();
                });
            }));
        }
        await Promise.all(promises);
    }

    update(diceLevels, gridWidth, gridHeight, diceSize = 10, spacing = true) {
        // Clear previous meshes
        this.scene.children = this.scene.children.filter(c => !c.isMesh && !c.isGroup);
        // Re-add lights (already in scene, filter might have removed them if not careful)
        // Actually simpler to just remove non-light children
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj.isMesh || obj.isGroup) {
                this.scene.remove(obj);
            }
        }

        const meshGroup = new THREE.Group();
        const step = diceSize + (spacing ? 0.4 : 0);
        const ox = -(gridWidth * step) / 2;
        const oy = (gridHeight * step) / 2;

        // Materials cache to avoid recreating them for every die
        const materials = {};
        for (let i = 1; i <= 6; i++) {
            const sideMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.5 });
            const topMat = new THREE.MeshStandardMaterial({
                map: this.textures[i],
                roughness: 0.2,
                metalness: 0.3
            });
            // Order: [+X, -X, +Y, -Y, +Z, -Z]
            materials[i] = [sideMat, sideMat, sideMat, sideMat, topMat, sideMat];
        }

        const skipCount = Math.max(1, Math.floor((gridWidth * gridHeight) / 5000)); // Performance optimization for huge grids

        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const idx = y * gridWidth + x;
                const face = diceLevels[idx];
                if (face < 1 || face > 6) continue;

                const px = ox + x * step;
                const py = oy - (y + 1) * step;

                const mesh = new THREE.Mesh(this.boxGeometry, materials[face]);
                mesh.position.set(px, py, 0);
                mesh.scale.set(diceSize / 10, diceSize / 10, diceSize / 10);
                mesh.rotation.x = -Math.PI / 2; // Face up (+Z in world is Top face in Three box)
                meshGroup.add(mesh);
            }
        }

        this.scene.add(meshGroup);

        // Zoom to fit
        const box = new THREE.Box3().setFromObject(meshGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.3;

        this.camera.position.set(center.x, center.y - maxDim * 0.5, cameraZ);
        this.controls.target.copy(center);
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }
}
