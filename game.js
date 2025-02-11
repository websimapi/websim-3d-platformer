import * as THREE from 'three';

class Game {
  constructor() {
    // Initialize renderer first
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue background
    document.body.appendChild(this.renderer.domElement);

    // Scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Constants
    this.NORMAL_HEIGHT = 1.75; // 1.75 meters
    this.SHORT_HEIGHT = this.NORMAL_HEIGHT / 2;
    
    // Setup sequence
    this.setupWorld();
    this.setupPlayers();
    this.setupLighting();
    this.setupCamera();
    this.setupControls();
    
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
    this.createPlatform(2, 1, 2, 0x404040, -3, 0.5, -3);
    this.createPlatform(2, 1, 2, 0x404040, 3, 1, 3);
    this.createPlatform(2, 1, 2, 0x404040, -3, 1.5, 3);
  }

  createPlatform(width, height, depth, color, x, y, z) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({ color });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    this.scene.add(platform);
  }

  setupPlayers() {
    // Green (tall) player - using cylinder + spheres for capsule-like shape
    const greenHeight = this.NORMAL_HEIGHT - 0.6;
    const greenRadius = 0.3;
    
    const greenGroup = new THREE.Group();
    
    // Cylinder body
    const greenBodyGeometry = new THREE.CylinderGeometry(greenRadius, greenRadius, greenHeight, 16);
    const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const greenBody = new THREE.Mesh(greenBodyGeometry, greenMaterial);
    greenGroup.add(greenBody);
    
    // Top sphere
    const greenTopSphere = new THREE.Mesh(
      new THREE.SphereGeometry(greenRadius, 16, 16),
      greenMaterial
    );
    greenTopSphere.position.y = greenHeight/2;
    greenGroup.add(greenTopSphere);
    
    // Bottom sphere
    const greenBottomSphere = new THREE.Mesh(
      new THREE.SphereGeometry(greenRadius, 16, 16),
      greenMaterial
    );
    greenBottomSphere.position.y = -greenHeight/2;
    greenGroup.add(greenBottomSphere);
    
    this.greenPlayer = greenGroup;
    this.greenPlayer.position.set(-2, this.NORMAL_HEIGHT / 2, 0);
    this.scene.add(this.greenPlayer);

    // Orange (short) player
    const orangeHeight = this.SHORT_HEIGHT - 0.3;
    const orangeRadius = 0.15;
    
    const orangeGroup = new THREE.Group();
    
    // Cylinder body
    const orangeBodyGeometry = new THREE.CylinderGeometry(orangeRadius, orangeRadius, orangeHeight, 16);
    const orangeMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
    const orangeBody = new THREE.Mesh(orangeBodyGeometry, orangeMaterial);
    orangeGroup.add(orangeBody);
    
    // Top sphere
    const orangeTopSphere = new THREE.Mesh(
      new THREE.SphereGeometry(orangeRadius, 16, 16),
      orangeMaterial
    );
    orangeTopSphere.position.y = orangeHeight/2;
    orangeGroup.add(orangeTopSphere);
    
    // Bottom sphere
    const orangeBottomSphere = new THREE.Mesh(
      new THREE.SphereGeometry(orangeRadius, 16, 16),
      orangeMaterial
    );
    orangeBottomSphere.position.y = -orangeHeight/2;
    orangeGroup.add(orangeBottomSphere);
    
    this.orangePlayer = orangeGroup;
    this.orangePlayer.position.set(2, this.SHORT_HEIGHT / 2, 0);
    this.scene.add(this.orangePlayer);

    // Physics properties
    this.greenVelocity = new THREE.Vector3();
    this.orangeVelocity = new THREE.Vector3();
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
      up: false, down: false, left: false, right: false, enter: false
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
    }
  }

  updatePlayer(player, velocity, controls, jumpKey, speed, gravity) {
    // Movement
    const moveX = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const moveZ = (controls.down ? 1 : 0) - (controls.up ? 1 : 0);

    velocity.x = moveX * speed;
    velocity.z = moveZ * speed;

    // Gravity and jumping
    velocity.y -= gravity;
    
    // Get the height based on which player it is
    const playerHeight = (player === this.greenPlayer) ? this.NORMAL_HEIGHT : this.SHORT_HEIGHT;
    
    if (player.position.y <= playerHeight / 2) {
      player.position.y = playerHeight / 2;
      velocity.y = 0;
      if (jumpKey) {
        velocity.y = 0.2;
      }
    }

    // Apply velocity
    player.position.x += velocity.x;
    player.position.y += velocity.y;
    player.position.z += velocity.z;

    // Keep players within bounds
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

    // Update green player
    this.updatePlayer(
      this.greenPlayer,
      this.greenVelocity,
      { up: this.keys.w, down: this.keys.s, left: this.keys.a, right: this.keys.d },
      this.keys.space,
      0.1,
      0.01
    );

    // Update orange player
    this.updatePlayer(
      this.orangePlayer,
      this.orangeVelocity,
      { up: this.keys.up, down: this.keys.down, left: this.keys.left, right: this.keys.right },
      this.keys.enter,
      0.1,
      0.01
    );

    // Ensure we're rendering
    this.renderer.render(this.scene, this.camera);
  }
}

// Create game instance
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});