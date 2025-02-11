import * as THREE from 'three';

// Global variables for editor
let selectedObjectType = 'platform';
let selectedColor = 0x505050;

export function initEditorControls(gameInstance) {
  const objectTypeSelect = document.getElementById('objectType');
  const colorPicker = document.getElementById('colorPicker');
  const clearSelection = document.getElementById('clearSelection');
  
  objectTypeSelect.addEventListener('change', (e) => {
    selectedObjectType = e.target.value;
  });
  
  colorPicker.addEventListener('input', (e) => {
    selectedColor = parseInt(e.target.value.replace('#', '0x'));
  });
  
  clearSelection.addEventListener('click', () => {
    // This can clear any current selection in future implementations
    // For now, it just resets the selectors
    objectTypeSelect.value = 'platform';
    selectedObjectType = 'platform';
    colorPicker.value = "#505050";
    selectedColor = 0x505050;
  });
}

// When in editor mode, clicking on the scene will add an object at the ground or at intersection
export function editorClickHandler(event, gameInstance) {
  event.preventDefault();
  // Get mouse position normalized (-1 to 1)
  const mouse = new THREE.Vector2();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, gameInstance.camera);
  
  // We'll try to intersect with the ground plane at y=0
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  if(!intersectPoint) return;
  
  // Depending on the selected type, add the corresponding object.
  switch(selectedObjectType) {
    case "platform":
      // Create a basic platform (box) of fixed size for now
      const width = 2, height = 0.3, depth = 2;
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshPhongMaterial({ color: selectedColor });
      const platform = new THREE.Mesh(geometry, material);
      platform.position.copy(intersectPoint);
      platform.position.y += height/2; // lift so it sits on the ground
      platform.castShadow = true;
      platform.receiveShadow = true;
      gameInstance.scene.add(platform);
      gameInstance.platforms.push(platform);
      break;
    case "spawn":
      // For spawn points, we'll add a small helper marker (a simple sphere)
      const spawnGeometry = new THREE.SphereGeometry(0.2, 12, 12);
      const spawnMaterial = new THREE.MeshBasicMaterial({ color: selectedColor });
      const spawnMarker = new THREE.Mesh(spawnGeometry, spawnMaterial);
      spawnMarker.position.copy(intersectPoint);
      spawnMarker.position.y += 0.2;
      gameInstance.scene.add(spawnMarker);
      break;
    case "key":
      // Remove old key if exists, then add new key at clicked position.
      if(gameInstance.key) {
        gameInstance.scene.remove(gameInstance.key);
      }
      const keyGroup = new THREE.Group();

      // Key head
      const headGeometry = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
      const keyMaterial = new THREE.MeshPhongMaterial({ color: selectedColor });
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
      [-0.4, -0.5].forEach(x => {
        const tooth = new THREE.Mesh(toothGeometry, keyMaterial);
        tooth.position.set(x, -0.12, 0);
        keyGroup.add(tooth);
      });

      keyGroup.position.copy(intersectPoint);
      keyGroup.position.y += 0.5;
      keyGroup.castShadow = true;
      gameInstance.key = keyGroup;
      gameInstance.scene.add(keyGroup);
      break;
    case "door":
      // Create a door similar to the game door setup
      const doorGroup = new THREE.Group();
      const frameGeometry = new THREE.BoxGeometry(2, 3, 0.3);
      const frameMaterial = new THREE.MeshPhongMaterial({ color: selectedColor });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.position.y = 1.5;
      doorGroup.add(frame);

      const doorGeometry = new THREE.BoxGeometry(1.6, 2.6, 0.2);
      const doorMaterial = new THREE.MeshPhongMaterial({ color: selectedColor });
      const doorPanel = new THREE.Mesh(doorGeometry, doorMaterial);
      doorPanel.position.y = 1.3;
      doorPanel.position.z = 0.1;
      doorGroup.add(doorPanel);

      const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
      const handleMaterial = new THREE.MeshPhongMaterial({ color: selectedColor });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0.5, 1.3, 0.2);
      doorGroup.add(handle);

      doorGroup.position.copy(intersectPoint);
      doorGroup.position.y += 1.5;
      doorGroup.castShadow = true;
      doorGroup.receiveShadow = true;
      gameInstance.door = doorGroup;
      gameInstance.scene.add(doorGroup);
      break;
    default:
      break;
  }
}