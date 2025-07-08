import * as THREE from 'three';

export class CharacterSystem {
    constructor(scene) {
        this.scene = scene;
        this.characters = new Map();
        this.animations = new Map();
        
        this.initializeCharacterSystem();
    }
    
    initializeCharacterSystem() {
        // Create character materials
        this.characterMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513
        });
        
        this.armorMaterial = new THREE.MeshLambertMaterial({
            color: 0x696969
        });
        
        this.mixers = [];
    }
    
    createCharacter(playerId, position = { x: 0, y: 0, z: 0 }) {
        const character = new THREE.Group();
        
        // Create basic humanoid mesh
        const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.2, 3, 8);
        const body = new THREE.Mesh(bodyGeometry, this.characterMaterial);
        body.position.y = 1.5;
        character.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.8, 8, 8);
        const head = new THREE.Mesh(headGeometry, this.characterMaterial);
        head.position.y = 3.5;
        character.add(head);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 6);
        const leftArm = new THREE.Mesh(armGeometry, this.characterMaterial);
        leftArm.position.set(-1.5, 2, 0);
        character.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, this.characterMaterial);
        rightArm.position.set(1.5, 2, 0);
        character.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2, 6);
        const leftLeg = new THREE.Mesh(legGeometry, this.characterMaterial);
        leftLeg.position.set(-0.5, -0.5, 0);
        character.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, this.characterMaterial);
        rightLeg.position.set(0.5, -0.5, 0);
        character.add(rightLeg);
        
        // Armor pieces
        const chestplateGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const chestplate = new THREE.Mesh(chestplateGeometry, this.armorMaterial);
        chestplate.position.set(0, 2, 0.3);
        character.add(chestplate);
        
        // Helmet
        const helmetGeometry = new THREE.CylinderGeometry(0.9, 0.9, 1, 8);
        const helmet = new THREE.Mesh(helmetGeometry, this.armorMaterial);
        helmet.position.y = 3.5;
        character.add(helmet);
        
        // Set initial position
        character.position.set(position.x, position.y, position.z);
        
        // Add character data
        character.userData = {
            playerId,
            isMoving: false,
            isRunning: false,
            lastPosition: { ...position },
            targetPosition: { ...position },
            animationState: 'idle'
        };
        
        // Create animation data
        this.createCharacterAnimations(character);
        
        this.scene.add(character);
        this.characters.set(playerId, character);
        
        return character;
    }
    
    createCharacterAnimations(character) {
        const mixer = new THREE.AnimationMixer(character);
        
        // Create walk animation
        const walkAnimation = this.createWalkAnimation(character);
        const walkAction = mixer.clipAction(walkAnimation);
        
        // Create run animation
        const runAnimation = this.createRunAnimation(character);
        const runAction = mixer.clipAction(runAnimation);
        
        // Create idle animation
        const idleAnimation = this.createIdleAnimation(character);
        const idleAction = mixer.clipAction(idleAnimation);
        
        character.userData.mixer = mixer;
        character.userData.animations = {
            walk: walkAction,
            run: runAction,
            idle: idleAction
        };
        
        // Start with idle animation
        idleAction.play();
        
        this.mixers.push(mixer);
    }
    
    createWalkAnimation(character) {
        const tracks = [];
        
        // Simple walk cycle - swaying motion
        const times = [0, 0.5, 1];
        const positionValues = [0, 0, 0, 0, 0.1, 0, 0, 0, 0];
        
        const positionTrack = new THREE.VectorKeyframeTrack(
            '.position',
            times,
            positionValues
        );
        
        // Rotation sway
        const rotationValues = [0, 0, 0, 1, 0, 0.1, 0, 0.99, 0, 0, 0, 1];
        const rotationTrack = new THREE.QuaternionKeyframeTrack(
            '.quaternion',
            times,
            rotationValues
        );
        
        tracks.push(positionTrack, rotationTrack);
        
        return new THREE.AnimationClip('walk', 1, tracks);
    }
    
    createRunAnimation(character) {
        const tracks = [];
        
        // Faster, more pronounced movement
        const times = [0, 0.25, 0.5, 0.75, 1];
        const positionValues = [0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0];
        
        const positionTrack = new THREE.VectorKeyframeTrack(
            '.position',
            times,
            positionValues
        );
        
        tracks.push(positionTrack);
        
        return new THREE.AnimationClip('run', 0.6, tracks);
    }
    
    createIdleAnimation(character) {
        const tracks = [];
        
        // Subtle breathing animation
        const times = [0, 1, 2];
        const positionValues = [0, 0, 0, 0, 0.05, 0, 0, 0, 0];
        
        const positionTrack = new THREE.VectorKeyframeTrack(
            '.position',
            times,
            positionValues
        );
        
        tracks.push(positionTrack);
        
        return new THREE.AnimationClip('idle', 2, tracks);
    }
    
    updateCharacter(playerId, position, isMoving, isRunning) {
        const character = this.characters.get(playerId);
        if (!character) return;
        
        // Update position
        character.userData.targetPosition = { ...position };
        character.userData.isMoving = isMoving;
        character.userData.isRunning = isRunning;
        
        // Update animations
        const animations = character.userData.animations;
        const newState = isMoving ? (isRunning ? 'run' : 'walk') : 'idle';
        
        if (character.userData.animationState !== newState) {
            // Fade out current animation
            const currentAnim = animations[character.userData.animationState];
            if (currentAnim) {
                currentAnim.fadeOut(0.2);
            }
            
            // Fade in new animation
            const newAnim = animations[newState];
            if (newAnim) {
                newAnim.fadeIn(0.2);
                newAnim.play();
            }
            
            character.userData.animationState = newState;
        }
    }
    
    updateAnimations(deltaTime) {
        // Update all animation mixers
        for (const mixer of this.mixers) {
            mixer.update(deltaTime);
        }
        
        // Smooth character movement
        this.characters.forEach((character) => {
            const userData = character.userData;
            const target = userData.targetPosition;
            const current = character.position;
            
            // Smooth interpolation
            const lerpFactor = userData.isRunning ? 0.1 : 0.05;
            current.lerp(new THREE.Vector3(target.x, target.y, target.z), lerpFactor);
            
            // Face movement direction
            if (userData.isMoving) {
                const direction = new THREE.Vector3(
                    target.x - userData.lastPosition.x,
                    0,
                    target.z - userData.lastPosition.z
                ).normalize();
                
                if (direction.length() > 0.1) {
                    character.lookAt(
                        character.position.x + direction.x,
                        character.position.y,
                        character.position.z + direction.z
                    );
                }
            }
            
            userData.lastPosition = { ...current };
        });
    }
    
    removeCharacter(playerId) {
        const character = this.characters.get(playerId);
        if (character) {
            this.scene.remove(character);
            
            // Remove mixer
            const mixerIndex = this.mixers.indexOf(character.userData.mixer);
            if (mixerIndex !== -1) {
                this.mixers.splice(mixerIndex, 1);
            }
            
            this.characters.delete(playerId);
        }
    }
    
    getCharacter(playerId) {
        return this.characters.get(playerId);
    }
}

