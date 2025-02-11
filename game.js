import * as THREE from 'three';

class Game {
  constructor() {
    // Initialize renderer first
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB);
    document.body.appendChild(this.renderer.domElement);

    // Scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Constants
    this.NORMAL_HEIGHT = 1.75;
    this.SHORT_HEIGHT = this.NORMAL_HEIGHT / 2;
    
    // Active player tracking
    this.activePlayer = null;
    this.cameraOffset = new THREE.Vector3(0, 5, 10);
    this.cameraLerpFactor = 0.1;
    
    // Setup sequence
    this.setupWorld();
    this.setupPlayers();
    this.setupLighting();
    this.setupCamera();
    this.setupControls();
    
    // Set initial active player
    this.setActivePlayer(this.greenPlayer);
    
    // Start animation loop
    this.animate();
    
    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  setupWorld() {
    // Ground
    const groundGeometry = new THREE.BoxGeometry(20, 1, 20);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.position.y = -0.5;
    this.scene.add(this.ground);

    // Platforms
    this.platforms = [];
    this.addPlatform(2, 1, 2, 0x404040, -3, 0.5, -3);
    this.addPlatform(2, 1, 2, 0x404040, 3, 1, 3);
    this.addPlatform(2, 1, 2, 0x404040, -3, 1.5, 3);
  }

  addPlatform(width, height, depth, color, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    this.scene.add(platform);
    this.platforms.push(platform);
  }

  setupPlayers() {
    // Green (tall) player
    const greenGeometry = new THREE.BoxGeometry(0.6, this.NORMAL_HEIGHT, 0.6);
    const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.greenPlayer = new THREE.Mesh(greenGeometry, greenMaterial);
    this.greenPlayer.position.set(-2, this.NORMAL_HEIGHT / 2, 0);
    this.scene.add(this.greenPlayer);

    // Orange (short) player
    const orangeGeometry = new THREE.BoxGeometry(0.3, this.SHORT_HEIGHT, 0.3);
    const orangeMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
    this.orangePlayer = new THREE.Mesh(orangeGeometry, orangeMaterial);
    this.orangePlayer.position.set(2, this.SHORT_HEIGHT / 2, 0);
    this.scene.add(this.orangePlayer);

    // Physics properties
    this.greenVelocity = new THREE.Vector3();
    this.orangeVelocity = new THREE.Vector3();
  }

  setActivePlayer(player) {
    this.activePlayer = player;
  }

  setupLighting() {
    // Brighter ambient light
    const ambientLight = new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);

    // Brighter directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // Add another directional light from a different angle
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
      tab: false
    };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onKeyDown(event) {
    switch(event.key.toLowerCase()) {
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
    }
  }

  onKeyUp(event) {
    switch(event.key.toLowerCase()) {
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
    }
  }

  switchPlayer() {
    this.activePlayer = (this.activePlayer === this.greenPlayer) ? this.orangePlayer : this.greenPlayer;
  }

  checkCollision(player, other) {
    const playerBox = new THREE.Box3().setFromObject(player);
    const otherBox = new THREE.Box3().setFromObject(other);
    return playerBox.intersectsBox(otherBox);
  }

  updateCamera() {
    if (!this.activePlayer) return;

    const targetPosition = this.activePlayer.position.clone();
    const idealOffset = this.cameraOffset.clone();
    
    // Calculate ideal camera position
    const idealPosition = targetPosition.clone().add(idealOffset);
    
    // Smoothly interpolate camera position
    this.camera.position.lerp(idealPosition, this.cameraLerpFactor);
    
    // Look at player
    this.camera.lookAt(targetPosition);
  }

  updatePlayer(player, velocity, controls, jumpKey, speed, gravity) {
    const moveX = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const moveZ = (controls.down ? 1 : 0) - (controls.up ? 1 : 0);

    velocity.x = moveX * speed;
    velocity.z = moveZ * speed;

    // Store old position for collision resolution
    const oldPosition = player.position.clone();

    // Apply gravity
    velocity.y -= gravity;
    
    // Update position
    player.position.x += velocity.x;
    player.position.y += velocity.y;
    player.position.z += velocity.z;

    // Check collisions with other player
    const otherPlayer = (player === this.greenPlayer) ? this.orangePlayer : this.greenPlayer;
    if (this.checkCollision(player, otherPlayer)) {
      // Handle vertical collision (standing on top)
      if (oldPosition.y > otherPlayer.position.y + otherPlayer.geometry.parameters.height/2) {
        player.position.y = otherPlayer.position.y + otherPlayer.geometry.parameters.height;
        velocity.y = 0;
        if (jumpKey) velocity.y = 0.2;
      } else {
        // Horizontal collision - revert to old position
        player.position.copy(oldPosition);
      }
    }

    // Ground collision
    const playerHeight = player.geometry.parameters.height;
    if (player.position.y <= playerHeight/2) {
      player.position.y = playerHeight/2;
      velocity.y = 0;
      if (jumpKey) velocity.y = 0.2;
    }

    // Platform collisions
    for (const platform of this.platforms) {
      if (this.checkCollision(player, platform)) {
        const platformTop = platform.position.y + platform.geometry.parameters.height/2;
        if (oldPosition.y > platformTop) {
          player.position.y = platformTop + playerHeight/2;
          velocity.y = 0;
          if (jumpKey) velocity.y = 0.2;
        } else {
          player.position.copy(oldPosition);
        }
      }
    }

    // Bounds checking
    const bounds = 9;
    player.position.x = Math.max(-bounds, Math.min(bounds, player.position.x));
    player.position.z = Math.max(-bounds, Math.min(bounds, player.position.z));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const isGreenActive = this.activePlayer === this.greenPlayer;
    
    // Update green player
    this.updatePlayer(
      this.greenPlayer,
      this.greenVelocity,
      isGreenActive ? { up: this.keys.w, down: this.keys.s, left: this.keys.a, right: this.keys.d } : {},
      isGreenActive && this.keys.space,
      0.1,
      0.01
    );

    // Update orange player
    this.updatePlayer(
      this.orangePlayer,
      this.orangeVelocity,
      !isGreenActive ? { up: this.keys.w, down: this.keys.s, left: this.keys.a, right: this.keys.d } : {},
      !isGreenActive && this.keys.space,
      0.1,
      0.01
    );

    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});