import { CryptoUtils } from './crypto-utils.js';

export class HostSystem {
    constructor(room) {
        this.room = room;
        this.isHost = false;
        this.keyPair = null;
        this.publicKeyString = null;
        this.actionQueue = [];
        this.actionCounter = 0;
        this.hostPublicKey = null;
        
        this.initializeHost();
    }
    
    async initializeHost() {
        // Subscribe to room state changes
        this.room.subscribeRoomState((roomState) => {
            if (roomState.hostPublicKey && roomState.hostPublicKey !== this.hostPublicKey) {
                this.hostPublicKey = roomState.hostPublicKey;
                this.updateHostStatus();
            }
        });
        
        // Subscribe to presence update requests (for host validation)
        this.room.subscribePresenceUpdateRequests(async (updateRequest, fromClientId) => {
            if (this.isHost) {
                await this.processActionRequest(updateRequest, fromClientId);
            }
        });
        
        // Handle signed actions
        this.room.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'signed_action') {
                this.handleSignedAction(data);
            }
        };
    }
    
    async becomeHost() {
        if (this.isHost) return;
        
        try {
            // Generate key pair
            this.keyPair = await CryptoUtils.generateKeyPair();
            this.publicKeyString = await CryptoUtils.exportPublicKey(this.keyPair.publicKey);
            
            // Announce hosting
            this.room.updateRoomState({
                hostPublicKey: this.publicKeyString,
                hostId: this.room.clientId,
                actionCounter: 0
            });
            
            this.isHost = true;
            this.actionCounter = 0;
            
            console.log('Became host with public key:', this.publicKeyString);
            this.updateHostStatus();
            
        } catch (error) {
            console.error('Failed to become host:', error);
        }
    }
    
    async leaveHost() {
        if (!this.isHost) return;
        
        // Clear host status
        this.room.updateRoomState({
            hostPublicKey: null,
            hostId: null,
            actionCounter: null
        });
        
        this.isHost = false;
        this.keyPair = null;
        this.publicKeyString = null;
        this.actionCounter = 0;
        
        console.log('Left host role');
        this.updateHostStatus();
    }
    
    async processActionRequest(actionRequest, fromClientId) {
        if (!this.isHost) return;
        
        // Create action with sequence number
        const action = {
            type: actionRequest.type,
            playerId: fromClientId,
            data: actionRequest.data,
            sequenceNumber: this.actionCounter++,
            timestamp: Date.now()
        };
        
        try {
            // Sign the action
            const signature = await CryptoUtils.signAction(this.keyPair.privateKey, action);
            
            // Broadcast signed action
            this.room.send({
                type: 'signed_action',
                action: action,
                signature: signature,
                hostId: this.room.clientId,
                echo: true
            });
            
            // Update room state with action counter
            this.room.updateRoomState({
                actionCounter: this.actionCounter
            });
            
        } catch (error) {
            console.error('Failed to sign action:', error);
        }
    }
    
    async handleSignedAction(data) {
        if (!this.hostPublicKey) {
            console.warn('No host public key available');
            return;
        }
        
        try {
            // Import host public key
            const publicKey = await CryptoUtils.importPublicKey(this.hostPublicKey);
            
            // Verify action signature
            const isValid = await CryptoUtils.verifyAction(
                publicKey,
                data.action,
                data.signature
            );
            
            if (isValid) {
                // Process verified action
                this.executeAction(data.action);
            } else {
                console.warn('Invalid action signature from host');
            }
            
        } catch (error) {
            console.error('Failed to verify action:', error);
        }
    }
    
    executeAction(action) {
        console.log('Executing verified action:', action);
        
        switch (action.type) {
            case 'player_move':
                this.handlePlayerMove(action);
                break;
            case 'player_attack':
                this.handlePlayerAttack(action);
                break;
            case 'player_cast_spell':
                this.handlePlayerCastSpell(action);
                break;
            default:
                console.warn('Unknown action type:', action.type);
        }
    }
    
    handlePlayerMove(action) {
        // Validate movement is within bounds and reasonable
        const { x, y, z } = action.data.position;
        const maxDistance = 50; // Maximum movement per action
        
        // Add movement validation logic here
        
        // If valid, update the player's position
        this.room.send({
            type: 'player_position_update',
            playerId: action.playerId,
            position: { x, y, z },
            timestamp: action.timestamp,
            sequenceNumber: action.sequenceNumber
        });
    }
    
    handlePlayerAttack(action) {
        // Validate attack is within range and cooldown
        console.log('Player attack:', action);
        // Implement attack logic
    }
    
    handlePlayerCastSpell(action) {
        // Validate spell casting requirements
        console.log('Player cast spell:', action);
        // Implement spell logic
    }
    
    async requestAction(type, data) {
        if (!this.hostPublicKey) {
            console.warn('No host available to process action');
            return;
        }
        
        // Send action request to host
        this.room.send({
            type: 'action_request',
            actionType: type,
            data: data,
            clientId: this.room.clientId,
            timestamp: Date.now()
        });
    }
    
    updateHostStatus() {
        const hostStatus = document.getElementById('host-status');
        const hostKeyDisplay = document.getElementById('host-key-display');
        const publicKeySpan = document.getElementById('public-key');
        const playerCount = document.getElementById('player-count');
        const becomeHostBtn = document.getElementById('become-host');
        const leaveHostBtn = document.getElementById('leave-host');
        
        if (this.isHost) {
            hostStatus.textContent = 'Currently hosting';
            hostStatus.style.color = '#4CAF50';
            hostKeyDisplay.style.display = 'block';
            publicKeySpan.textContent = this.publicKeyString?.substring(0, 20) + '...';
            playerCount.textContent = Object.keys(this.room.peers).length;
            becomeHostBtn.style.display = 'none';
            leaveHostBtn.style.display = 'inline-block';
        } else {
            hostStatus.textContent = this.hostPublicKey ? 'Connected to host' : 'No host active';
            hostStatus.style.color = this.hostPublicKey ? '#4a90e2' : '#ff9800';
            hostKeyDisplay.style.display = 'none';
            becomeHostBtn.style.display = 'inline-block';
            leaveHostBtn.style.display = 'none';
        }
    }
}

