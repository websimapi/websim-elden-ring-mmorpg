import * as THREE from 'three';

export class TerrainSystem {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 200;
        this.tileSize = 10;
        this.chunks = new Map();
        this.heightmapData = null;
        
        this.initializeTerrain();
    }
    
    initializeTerrain() {
        // Create base terrain material
        this.terrainMaterial = new THREE.MeshLambertMaterial({
            color: 0x4a7c59,
            transparent: true,
            opacity: 0.9
        });
        
        // Generate initial terrain chunks
        this.generateInitialChunks();
        
        // Add terrain decoration
        this.addTerrainDecoration();
    }
    
    generateInitialChunks() {
        const chunkSize = 5;
        const chunksPerSide = 4;
        
        for (let x = -chunksPerSide; x <= chunksPerSide; x++) {
            for (let z = -chunksPerSide; z <= chunksPerSide; z++) {
                this.generateChunk(x, z, chunkSize);
            }
        }
    }
    
    generateChunk(chunkX, chunkZ, chunkSize) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        if (this.chunks.has(chunkKey)) {
            return;
        }
        
        const geometry = new THREE.PlaneGeometry(
            chunkSize * this.tileSize,
            chunkSize * this.tileSize,
            chunkSize * 2,
            chunkSize * 2
        );
        
        // Apply height variations
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] + chunkX * chunkSize * this.tileSize;
            const z = positions[i + 1] + chunkZ * chunkSize * this.tileSize;
            
            // Generate height based on noise function
            positions[i + 2] = this.getHeightAt(x, z);
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            chunkX * chunkSize * this.tileSize,
            0,
            chunkZ * chunkSize * this.tileSize
        );
        
        this.scene.add(mesh);
        this.chunks.set(chunkKey, mesh);
    }
    
    getHeightAt(x, z) {
        // Simple noise function for terrain height
        const scale = 0.01;
        const amplitude = 5;
        
        return (
            Math.sin(x * scale) * amplitude +
            Math.cos(z * scale) * amplitude * 0.5 +
            Math.sin(x * scale * 2) * amplitude * 0.25
        );
    }
    
    addTerrainDecoration() {
        // Add scattered rocks and vegetation
        const rockGeometry = new THREE.BoxGeometry(1, 1, 1);
        const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        
        const treeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
        
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            const y = this.getHeightAt(x, z);
            
            if (Math.random() < 0.3) {
                // Add rock
                const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                rock.position.set(x, y + 0.5, z);
                rock.scale.set(
                    0.5 + Math.random() * 1.5,
                    0.5 + Math.random() * 1.5,
                    0.5 + Math.random() * 1.5
                );
                this.scene.add(rock);
            } else {
                // Add tree
                const tree = new THREE.Mesh(treeGeometry, treeMaterial);
                tree.position.set(x, y + 4, z);
                tree.scale.set(
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4
                );
                this.scene.add(tree);
            }
        }
    }
    
    updateChunks(playerPosition) {
        // Dynamic chunk loading based on player position
        const chunkX = Math.floor(playerPosition.x / (5 * this.tileSize));
        const chunkZ = Math.floor(playerPosition.z / (5 * this.tileSize));
        
        const loadRadius = 2;
        
        for (let x = chunkX - loadRadius; x <= chunkX + loadRadius; x++) {
            for (let z = chunkZ - loadRadius; z <= chunkZ + loadRadius; z++) {
                this.generateChunk(x, z, 5);
            }
        }
    }
    
    applyHeightmap(heightmapData) {
        this.heightmapData = heightmapData;
        // TODO: Apply heightmap to existing chunks
    }
    
    getTerrainHeightAt(x, z) {
        return this.getHeightAt(x, z);
    }
}

