import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Constants
    this.NORMAL_HEIGHT = 1.75; // 1.75 meters
    this.SHORT_HEIGHT = this.NORMAL_HEIGHT / 2;
    
    this.setupWorld();
    this.setupPlayers();
    this.setupLighting();
    this.setupCamera();
    this.setupControls();
    
    this.animate();
    
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
    // Green (tall) player
    const greenGeometry = new THREE.CapsuleGeometry(0.3, this.NORMAL_HEIGHT - 0.6, 4, 8);
    const greenMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    this.greenPlayer = new THREE.Mesh(greenGeometry, greenMaterial);
    this.greenPlayer.position.set(-2, this.NORMAL_HEIGHT / 2, 0);
    this.scene.add(this.greenPlayer);

    // Orange (short) player
    const orangeGeometry = new THREE.CapsuleGeometry(0.15, this.SHORT_HEIGHT - 0.3, 4, 8);
    const orangeMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
    this.orangePlayer = new THREE.Mesh(orangeGeometry, orangeMaterial);
    this.orangePlayer.position.set(2, this.SHORT_HEIGHT / 2, 0);
    this.scene.add(this.orangePlayer);

    // Physics properties
    this.greenVelocity = new THREE.Vector3();
    this.orangeVelocity = new THREE.Vector3();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
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
    
    if (player.position.y <= player.geometry.parameters.radius + player.geometry.parameters.height / 2) {
      player.position.y = player.geometry.parameters.radius + player.geometry.parameters.height / 2;
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

    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game
new Game();