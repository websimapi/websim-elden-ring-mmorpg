import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { TerrainSystem } from './terrain.js';
import { CharacterSystem } from './character.js';
import { HostSystem } from './host.js';

class EldenRingMMORPG {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.room = null;
        this.hostSystem = null;
        this.terrainSystem = null;
        this.characterSystem = null;
        
        this.player = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0 },
            isMoving: false,
            isRunning: false,
            character: null
        };
        
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            running: false
        };
        
        this.mouse = {
            x: 0,
            y: 0,
            locked: false
        };
        
        this.clock = new THREE.Clock();
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }
    
    async init() {
        await this.initializeRoom();
        this.initializeThree();
        this.initializeSystems();
        this.initializeControls();
        this.initializeLighting();
        this.initializeUI();
        
        this.animate();
        this.hideLoadingScreen();
    }
    
    async initializeRoom() {
        this.room = new WebsimSocket();
        await this.room.initialize();
        
        this.room.subscribePresence((presence) => {
            this.updatePlayers(presence);
        });
        
        this.room.onmessage = (event) => {
            const data = event.data;
            switch (data.type) {
                case 'connected':
                    console.log(`Player ${data.username} connected`);
                    break;
                case 'disconnected':
                    console.log(`Player ${data.username} disconnected`);
                    this.characterSystem.removeCharacter(data.clientId);
                    break;
                case 'player_position_update':
                    this.handlePlayerPositionUpdate(data);
                    break;
            }
        };
        
        // Initialize host system
        this.hostSystem = new HostSystem(this.room);
        
        // Update connection status
        document.getElementById('connection-status').textContent = 'Connected to realm';
    }
    
    initializeThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 10, 10);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    initializeSystems() {
        // Terrain system
        this.terrainSystem = new TerrainSystem(this.scene);
        
        // Character system
        this.characterSystem = new CharacterSystem(this.scene);
        
        // Create player character
        this.player.character = this.characterSystem.createCharacter(
            this.room.clientId,
            this.player.position
        );
        
        // Update initial presence
        this.room.updatePresence({
            position: this.player.position,
            isMoving: this.player.isMoving,
            isRunning: this.player.isRunning
        });
    }
    
    initializeControls() {
        if (this.isMobile) {
            this.initializeMobileControls();
        } else {
            this.initializeDesktopControls();
        }
    }
    
    initializeDesktopControls() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.controls.forward = true;
                    break;
                case 'KeyS':
                    this.controls.backward = true;
                    break;
                case 'KeyA':
                    this.controls.left = true;
                    break;
                case 'KeyD':
                    this.controls.right = true;
                    break;
                case 'ShiftLeft':
                    this.controls.running = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.controls.forward = false;
                    break;
                case 'KeyS':
                    this.controls.backward = false;
                    break;
                case 'KeyA':
                    this.controls.left = false;
                    break;
                case 'KeyD':
                    this.controls.right = false;
                    break;
                case 'ShiftLeft':
                    this.controls.running = false;
                    break;
            }
        });
        
        // Mouse controls
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouse.locked = document.pointerLockElement === document.body;
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.mouse.locked) {
                this.mouse.x += event.movementX * 0.002;
                this.mouse.y += event.movementY * 0.002;
                this.mouse.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouse.y));
            }
        });
    }
    
    initializeMobileControls() {
        document.getElementById('mobile-controls').style.display = 'flex';
        
        // Movement joystick
        const movementJoystick = nipplejs.create({
            zone: document.getElementById('movement-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 120
        });
        
        movementJoystick.on('move', (evt, data) => {
            const force = Math.min(data.force, 1);
            const angle = data.angle.radian;
            
            this.controls.forward = Math.cos(angle) * force > 0.3;
            this.controls.backward = Math.cos(angle) * force < -0.3;
            this.controls.left = Math.sin(angle) * force < -0.3;
            this.controls.right = Math.sin(angle) * force > 0.3;
            this.controls.running = force > 0.7;
        });
        
        movementJoystick.on('end', () => {
            this.controls.forward = false;
            this.controls.backward = false;
            this.controls.left = false;
            this.controls.right = false;
            this.controls.running = false;
        });
        
        // Camera joystick
        const cameraJoystick = nipplejs.create({
            zone: document.getElementById('camera-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 120
        });
        
        cameraJoystick.on('move', (evt, data) => {
            const force = Math.min(data.force, 1);
            const angle = data.angle.radian;
            
            this.mouse.x += Math.sin(angle) * force * 0.02;
            this.mouse.y += Math.cos(angle) * force * 0.02;
            this.mouse.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouse.y));
        });
    }
    
    initializeLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Point light for atmosphere
        const pointLight = new THREE.PointLight(0xffa500, 0.5, 100);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);
    }
    
    initializeUI() {
        // Host controls
        document.getElementById('become-host').addEventListener('click', () => {
            this.hostSystem.becomeHost();
        });
        
        document.getElementById('leave-host').addEventListener('click', () => {
            this.hostSystem.leaveHost();
        });
    }
    
    updatePlayer() {
        const speed = this.controls.running ? 0.5 : 0.2;
        const deltaTime = this.clock.getDelta();
        
        let moved = false;
        
        // Movement
        if (this.controls.forward) {
            this.player.position.x += Math.sin(this.mouse.x) * speed;
            this.player.position.z += Math.cos(this.mouse.x) * speed;
            moved = true;
        }
        if (this.controls.backward) {
            this.player.position.x -= Math.sin(this.mouse.x) * speed;
            this.player.position.z -= Math.cos(this.mouse.x) * speed;
            moved = true;
        }
        if (this.controls.left) {
            this.player.position.x += Math.cos(this.mouse.x) * speed;
            this.player.position.z -= Math.sin(this.mouse.x) * speed;
            moved = true;
        }
        if (this.controls.right) {
            this.player.position.x -= Math.cos(this.mouse.x) * speed;
            this.player.position.z += Math.sin(this.mouse.x) * speed;
            moved = true;
        }
        
        // Update terrain height
        this.player.position.y = this.terrainSystem.getTerrainHeightAt(
            this.player.position.x,
            this.player.position.z
        ) + 2;
        
        // Update movement state
        this.player.isMoving = moved;
        this.player.isRunning = moved && this.controls.running;
        
        // Update character
        this.characterSystem.updateCharacter(
            this.room.clientId,
            this.player.position,
            this.player.isMoving,
            this.player.isRunning
        );
        
        // Update camera
        this.updateCamera();
        
        // Update terrain chunks
        this.terrainSystem.updateChunks(this.player.position);
        
        // Update UI
        this.updateUI();
        
        // Send position update
        if (moved) {
            this.room.updatePresence({
                position: this.player.position,
                isMoving: this.player.isMoving,
                isRunning: this.player.isRunning
            });
        }
    }
    
    updateCamera() {
        // Third person camera
        const cameraDistance = 15;
        const cameraHeight = 8;
        
        this.camera.position.x = this.player.position.x - Math.sin(this.mouse.x) * cameraDistance;
        this.camera.position.y = this.player.position.y + cameraHeight;
        this.camera.position.z = this.player.position.z - Math.cos(this.mouse.x) * cameraDistance;
        
        this.camera.lookAt(
            this.player.position.x,
            this.player.position.y + 2,
            this.player.position.z
        );
    }
    
    updateUI() {
        const positionDisplay = document.getElementById('position-display');
        positionDisplay.textContent = `Position: (${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)})`;
    }
    
    updatePlayers(presence) {
        if (!presence) {
            return;
        }
        
        Object.entries(presence).forEach(([clientId, playerData]) => {
            if (clientId === this.room.clientId) return;
            
            if (playerData.position) {
                // Create character if it doesn't exist
                if (!this.characterSystem.getCharacter(clientId)) {
                    this.characterSystem.createCharacter(clientId, playerData.position);
                }
                
                // Update character
                this.characterSystem.updateCharacter(
                    clientId,
                    playerData.position,
                    playerData.isMoving || false,
                    playerData.isRunning || false
                );
            }
        });
    }
    
    handlePlayerPositionUpdate(data) {
        if (data.playerId !== this.room.clientId) {
            this.characterSystem.updateCharacter(
                data.playerId,
                data.position,
                true,
                false
            );
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        this.updatePlayer();
        this.characterSystem.updateAnimations(deltaTime);
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game
new EldenRingMMORPG();