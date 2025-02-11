import * as THREE from 'three';
import { initEditorControls, editorClickHandler } from './editor.js';

class Game {
  constructor() {
    // Initialize renderer first
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87ceeb);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Scene, camera, and fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 30);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Constants
    this.NORMAL_HEIGHT = 1.75;
    this.SHORT_HEIGHT = this.NORMAL_HEIGHT / 2;
    this.TUNNEL_HEIGHT = 1.2; // Only small character can fit

    // Active player tracking
    this.activePlayer = null;
    this.cameraOffset = new THREE.Vector3(0, 5, 10);
    this.cameraLerpFactor = 0.1;

    // Add key tracking
    this.key = null;
    this.isHoldingKey = false;
    this.keyOffset = new THREE.Vector3(0.7, 0, 0); // Offset from player

    // Add door tracking
    this.door = null;
    this.isDoorOpen = false;

    // Level Editor Mode flag
    this.isEditorMode = false;

    // Setup sequence
    this.setupWorld();
    this.setupEnvironment();
    this.setupKey();
    this.setupDoor();  // Add door setup
    this.setupPlayers();
    this.setupLighting();
    this.setupCamera();
    this.setupControls();

    // Initialize editor controls (but they only become active when editor mode is on)
    initEditorControls(this);

    // Set initial active player
    this.setActivePlayer(this.greenPlayer);

    // Start animation loop
    this.animate();

    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // Listen for clicks for level editor
    window.addEventListener('mousedown', (e) => {
      if (this.isEditorMode) {
        editorClickHandler(e, this);
      }
    });
  }

  toggleEditorMode() {
    this.isEditorMode = !this.isEditorMode;
    // When toggling editor, pause player controls if needed.
  }

  setupWorld() {
    // Ground
    const groundGeometry = new THREE.BoxGeometry(20, 1, 20);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.position.y = -0.5;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Platforms array
    this.platforms = [];

    // Main platforms
    this.addPlatform(2, 1, 2, 0x404040, -3, 0.5, -3);
    this.addPlatform(2, 1, 2, 0x404040, 3, 1, 3);
    this.addPlatform(2, 1, 2, 0x404040, -3, 1.5, 3);

    // Additional platforming elements
    this.addPlatform(2, 0.3, 2, 0x505050, 5, 2, -3);
    this.addPlatform(2, 0.3, 2, 0x505050, 7, 2.5, -3);
    this.addPlatform(3, 0.3, 2, 0x505050, -5, 1.8, -4);

    // Create tunnel/cave structure
    this.createTunnel();

    // Add platform leading to door
    this.addPlatform(3, 0.3, 2, 0x505050, 3, 4, -5);
    this.addPlatform(2, 0.3, 2, 0x505050, 0, 4, -5);
  }

  addPlatform(width, height, depth, color, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);
    this.platforms.push(platform);
  }

  createTunnel() {
    // Tunnel walls
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x505050 });

    // Left wall
    const leftWall = new THREE.BoxGeometry(0.5, this.TUNNEL_HEIGHT, 4);
    const leftWallMesh = new THREE.Mesh(leftWall, wallMaterial);
    leftWallMesh.position.set(-6, this.TUNNEL_HEIGHT / 2, 0);
    leftWallMesh.castShadow = true;
    leftWallMesh.receiveShadow = true;
    this.scene.add(leftWallMesh);
    this.platforms.push(leftWallMesh);

    // Right wall
    const rightWall = new THREE.BoxGeometry(0.5, this.TUNNEL_HEIGHT, 4);
    const rightWallMesh = new THREE.Mesh(rightWall, wallMaterial);
    rightWallMesh.position.set(-4, this.TUNNEL_HEIGHT / 2, 0);
    rightWallMesh.castShadow = true;
    rightWallMesh.receiveShadow = true;
    this.scene.add(rightWallMesh);
    this.platforms.push(rightWallMesh);

    // Top of tunnel
    const tunnelTop = new THREE.BoxGeometry(2.5, 0.5, 4);
    const tunnelTopMesh = new THREE.Mesh(tunnelTop, wallMaterial);
    tunnelTopMesh.position.set(-5, this.TUNNEL_HEIGHT, 0);
    tunnelTopMesh.castShadow = true;
    tunnelTopMesh.receiveShadow = true;
    this.scene.add(tunnelTopMesh);
    this.platforms.push(tunnelTopMesh);

    // Back wall of tunnel
    const backWall = new THREE.BoxGeometry(2, this.TUNNEL_HEIGHT, 0.5);
    const backWallMesh = new THREE.Mesh(backWall, wallMaterial);
    backWallMesh.position.set(-5, this.TUNNEL_HEIGHT / 2, 2);
    backWallMesh.castShadow = true;
    backWallMesh.receiveShadow = true;
    this.scene.add(backWallMesh);
    this.platforms.push(backWallMesh);
  }

  setupEnvironment() {
    // Add some trees for detail
    const treePositions = [
      { x: -7, z: -7 },
      { x: 7, z: -6 },
      { x: -6, z: 7 },
      { x: 6, z: 6 },
      { x: 0, z: 8 }
    ];
    treePositions.forEach(pos => {
      this.createTree(pos.x, pos.z);
    });

    // Add a sun for extra atmosphere
    const sunGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-8, 8, -8);
    this.scene.add(sun);
  }

  createTree(x, z) {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(0, 0.5, 0);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Foliage
    const leavesGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(0, 1.5, 0);
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    this.scene.add(tree);
  }

  setupKey() {
    // Create a key mesh
    const keyGroup = new THREE.Group();

    // Key head (circular part)
    const headGeometry = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
    const keyMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const head = new THREE.Mesh(headGeometry, keyMaterial);
    head.rotation.x = Math.PI / 2;
    keyGroup.add(head);

    // Key shaft
    const shaftGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
    const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
    shaft.position.x = -0.3;
    keyGroup.add(shaft);

    // Key teeth
    const toothGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
    const positions = [-0.4, -0.5];
    positions.forEach(x => {
      const tooth = new THREE.Mesh(toothGeometry, keyMaterial);
      tooth.position.set(x, -0.12, 0);
      keyGroup.add(tooth);
    });

    // Position key inside tunnel
    keyGroup.position.set(-5, 0.5, 0);
    keyGroup.castShadow = true;
    this.key = keyGroup;
    this.scene.add(this.key);
  }

  setupDoor() {
    const doorGroup = new THREE.Group();

    // Door frame
    const frameGeometry = new THREE.BoxGeometry(2, 3, 0.3);
    const frameMaterial = new THREE.MeshPhongMaterial({ color: 0xdaa520 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = 1.5;
    doorGroup.add(frame);

    // Door panel
    const doorGeometry = new THREE.BoxGeometry(1.6, 2.6, 0.2);
    const doorMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const doorPanel = new THREE.Mesh(doorGeometry, doorMaterial);
    doorPanel.position.y = 1.3;
    doorPanel.position.z = 0.1;
    doorGroup.add(doorPanel);

    // Add handle
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({ color: 0xb8860b });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.5, 1.3, 0.2);
    doorGroup.add(handle);

    // Position the entire door
    doorGroup.position.set(1.5, 4, -6);
    doorGroup.castShadow = true;
    doorGroup.receiveShadow = true;

    this.door = doorGroup;
    this.scene.add(doorGroup);
  }

  setupPlayers() {
    // Green (tall) player - a rectangular box collider
    const greenGeometry = new THREE.BoxGeometry(0.6, this.NORMAL_HEIGHT, 0.6);
    const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.greenPlayer = new THREE.Mesh(greenGeometry, greenMaterial);
    this.greenPlayer.position.set(-2, this.NORMAL_HEIGHT / 2, 0);
    this.greenPlayer.castShadow = true;
    this.scene.add(this.greenPlayer);

    // Orange (short) player - a rectangular box collider
    const orangeGeometry = new THREE.BoxGeometry(0.3, this.SHORT_HEIGHT, 0.3);
    const orangeMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
    this.orangePlayer = new THREE.Mesh(orangeGeometry, orangeMaterial);
    this.orangePlayer.position.set(2, this.SHORT_HEIGHT / 2, 0);
    this.orangePlayer.castShadow = true;
    this.scene.add(this.orangePlayer);

    // Physics properties
    this.greenVelocity = new THREE.Vector3();
    this.orangeVelocity = new THREE.Vector3();
  }

  setActivePlayer(player) {
    this.activePlayer = player;
  }

  setupLighting() {
    // Ambient light for overall brightness
    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);

    // Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    // Secondary directional light from another angle
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.5);
    secondaryLight.position.set(-10, 5, -10);
    this.scene.add(secondaryLight);
  }

  setupCamera() {
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);
  }

  setupControls() {
    this.keys = {
      w: false, a: false, s: false, d: false, space: false,
      up: false, down: false, left: false, right: false, enter: false,
      tab: false, e: false
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  tryOpenDoor() {
    if (this.isHoldingKey && this.activePlayer) {
      const distance = this.activePlayer.position.distanceTo(this.door.position);
      if (distance < 2) {
        this.isDoorOpen = true;
        // Animate door opening
        this.door.rotation.y = Math.PI / 2;
        // Could add victory condition or next level logic here
      }
    }
  }

  onKeyDown(event) {
    if(this.isEditorMode) return; // disable gameplay controls in editor mode

    switch (event.key.toLowerCase()) {
      case 'w': this.keys.w = true; break;
      case 'a': this.keys.a = true; break;
      case 's': this.keys.s = true; break;
      case 'd': this.keys.d = true; break;
      case ' ': this.keys.space = true; break;
      case 'arrowup': this.keys.up = true; break;
      case 'arrowdown': this.keys.down = true; break;
      case 'arrowleft': this.keys.left = true; break;
      case 'arrowright': this.keys.right = true; break;
      case 'enter': this.keys.enter = true; break;
      case 'tab':
        event.preventDefault();
        this.keys.tab = true;
        this.switchPlayer();
        break;
      case 'e':
        this.keys.e = true;
        this.tryPickupKey();
        this.tryOpenDoor();  // Try to open door when E is pressed
        break;
    }
  }

  onKeyUp(event) {
    if(this.isEditorMode) return; // disable gameplay controls in editor mode
    switch (event.key.toLowerCase()) {
      case 'w': this.keys.w = false; break;
      case 'a': this.keys.a = false; break;
      case 's': this.keys.s = false; break;
      case 'd': this.keys.d = false; break;
      case ' ': this.keys.space = false; break;
      case 'arrowup': this.keys.up = false; break;
      case 'arrowdown': this.keys.down = false; break;
      case 'arrowleft': this.keys.left = false; break;
      case 'arrowright': this.keys.right = false; break;
      case 'enter': this.keys.enter = false; break;
      case 'tab': this.keys.tab = false; break;
      case 'e':
        this.keys.e = false;
        if (this.isHoldingKey) {
          this.dropKey();
        }
        break;
    }
  }

  switchPlayer() {
    this.activePlayer = (this.activePlayer === this.greenPlayer) ? this.orangePlayer : this.greenPlayer;
  }

  resolvePlayerCollision() {
    const box1 = new THREE.Box3().setFromObject(this.greenPlayer);
    const box2 = new THREE.Box3().setFromObject(this.orangePlayer);

    if (box1.intersectsBox(box2)) {
      // Find overlap along each axis
      const overlapX = Math.min(box1.max.x, box2.max.x) - Math.max(box1.min.x, box2.min.x);
      const overlapY = Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y);
      const overlapZ = Math.min(box1.max.z, box2.max.z) - Math.max(box1.min.z, box2.min.z);
      
      // Determine the smallest overlap axis
      const minOverlap = Math.min(overlapX, overlapY, overlapZ);
      
      // Create a separation vector
      const separation = new THREE.Vector3();
      if (minOverlap === overlapX) {
        separation.x = overlapX;
        separation.x *= (this.greenPlayer.position.x < this.orangePlayer.position.x ? -1 : 1);
      } else if (minOverlap === overlapY) {
        separation.y = overlapY;
        separation.y *= (this.greenPlayer.position.y < this.orangePlayer.position.y ? -1 : 1);
      } else if (minOverlap === overlapZ) {
        separation.z = overlapZ;
        separation.z *= (this.greenPlayer.position.z < this.orangePlayer.position.z ? -1 : 1);
      }
      // Apply half of the separation to each player for even pushback
      this.greenPlayer.position.add(separation.clone().multiplyScalar(0.5));
      this.orangePlayer.position.sub(separation.clone().multiplyScalar(0.5));
      
      if (minOverlap === overlapY) {
        this.greenVelocity.y = 0;
        this.orangeVelocity.y = 0;
      }
    }
  }

  tryPickupKey() {
    if (!this.isHoldingKey && this.activePlayer) {
      const distance = this.activePlayer.position.distanceTo(this.key.position);
      if (distance < 1.5) {
        this.isHoldingKey = true;
      }
    }
  }

  dropKey() {
    this.isHoldingKey = false;
  }

  updateKey() {
    if (this.isHoldingKey && this.activePlayer) {
      const targetPosition = this.activePlayer.position.clone()
        .add(this.keyOffset.clone().applyQuaternion(this.activePlayer.quaternion));
      this.key.position.lerp(targetPosition, 0.3);
    }
  }

  updateCamera() {
    if (!this.activePlayer) return;
    const targetPosition = this.activePlayer.position.clone();
    const idealOffset = this.cameraOffset.clone();
    const idealPosition = targetPosition.clone().add(idealOffset);
    this.camera.position.lerp(idealPosition, this.cameraLerpFactor);
    this.camera.lookAt(targetPosition);
  }

  updatePlayer(player, velocity, controls, jumpKey, speed, gravity) {
    const moveX = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const moveZ = (controls.down ? 1 : 0) - (controls.up ? 1 : 0);
    velocity.x = moveX * speed;
    velocity.z = moveZ * speed;

    const halfHeight = player.geometry.parameters.height / 2;
    const oldPosition = player.position.clone();
    const oldY = player.position.y;

    // Update horizontal movement
    player.position.x += velocity.x;
    player.position.z += velocity.z;
    for (const platform of this.platforms) {
      if (this.checkCollision(player, platform)) {
        const platformBox = new THREE.Box3().setFromObject(platform);
        const platformTop = platformBox.max.y;
        const playerBottom = player.position.y - halfHeight;
        if (Math.abs(playerBottom - platformTop) > 0.2) {
          player.position.x = oldPosition.x;
          player.position.z = oldPosition.z;
          velocity.x = 0;
          velocity.z = 0;
          break;
        }
      }
    }

    // Apply gravity
    velocity.y -= gravity;
    player.position.y += velocity.y;

    // Check vertical collisions with platforms
    for (const platform of this.platforms) {
      if (this.checkCollision(player, platform)) {
        const platformBox = new THREE.Box3().setFromObject(platform);
        const platformTop = platformBox.max.y;
        const currentBottom = player.position.y - halfHeight;
        if (oldY - halfHeight >= platformTop - 0.1 && currentBottom < platformTop + 0.5) {
          player.position.y = platformTop + halfHeight;
          velocity.y = 0;
          if (jumpKey) {
            velocity.y = 0.2;
            player.position.y += velocity.y;
          }
        } else {
          player.position.y = oldY;
          velocity.y = 0;
        }
      }
    }

    // Ensure player does not go below ground
    if (player.position.y < halfHeight) {
      player.position.y = halfHeight;
      velocity.y = 0;
      if (jumpKey) {
        velocity.y = 0.2;
        player.position.y += velocity.y;
      }
    }

    // Horizontal bounds checking
    const bounds = 9;
    player.position.x = Math.max(-bounds, Math.min(bounds, player.position.x));
    player.position.z = Math.max(-bounds, Math.min(bounds, player.position.z));
  }

  checkCollision(obj1, obj2) {
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);
    return box1.intersectsBox(box2);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if(!this.isEditorMode) {
      const isGreenActive = this.activePlayer === this.greenPlayer;
      this.updatePlayer(
        this.greenPlayer,
        this.greenVelocity,
        isGreenActive ? { up: this.keys.w, down: this.keys.s, left: this.keys.a, right: this.keys.d } : {},
        isGreenActive && this.keys.space,
        0.1,
        0.01
      );
      this.updatePlayer(
        this.orangePlayer,
        this.orangeVelocity,
        !isGreenActive ? { up: this.keys.w, down: this.keys.s, left: this.keys.a, right: this.keys.d } : {},
        !isGreenActive && this.keys.space,
        0.1,
        0.01
      );
      this.resolvePlayerCollision();
      this.updateKey();
    }
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});