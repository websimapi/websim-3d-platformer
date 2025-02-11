import * as THREE from 'three';

// Global variables for editor
let selectedObjectType = 'platform';
let selectedColor = 0x505050;
let selectedObject = null;

// Export clearSelectedObject for use from index.html when switching modes
export function clearSelectedObjectExternal() {
  clearSelectedObject();
}

// Expose for index access if needed
window.clearSelectedObject = clearSelectedObjectExternal;

export function initEditorControls(gameInstance) {
  const objectTypeSelect = document.getElementById('objectType');
  const colorPicker = document.getElementById('colorPicker');
  const clearSelection = document.getElementById('clearSelection');
  const objectEditorPanel = document.getElementById('objectEditor');
  const posXInput = document.getElementById('posX');
  const posYInput = document.getElementById('posY');
  const posZInput = document.getElementById('posZ');
  const applyButton = document.getElementById('applyTransform');
  const moveIncrementInput = document.getElementById('moveIncrement');
  const axisButtons = document.querySelectorAll('#axisTool button');
  
  objectTypeSelect.addEventListener('change', (e) => {
    selectedObjectType = e.target.value;
  });
  
  colorPicker.addEventListener('input', (e) => {
    selectedColor = parseInt(e.target.value.replace('#', '0x'));
  });
  
  clearSelection.addEventListener('click', () => {
    // Reset selectors to defaults
    objectTypeSelect.value = 'platform';
    selectedObjectType = 'platform';
    colorPicker.value = "#505050";
    selectedColor = 0x505050;
    clearSelectedObject();
  });
  
  applyButton.addEventListener('click', () => {
    if (selectedObject) {
      const x = parseFloat(posXInput.value);
      const y = parseFloat(posYInput.value);
      const z = parseFloat(posZInput.value);
      selectedObject.position.set(x, y, z);
    }
  });
  
  axisButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!selectedObject) return;
      const axis = button.getAttribute('data-axis');
      const dir = parseFloat(button.getAttribute('data-dir'));
      const increment = parseFloat(moveIncrementInput.value) || 0.1;
      if(axis === 'x') {
        selectedObject.position.x += dir * increment;
      } else if(axis === 'y') {
        selectedObject.position.y += dir * increment;
      } else if(axis === 'z') {
        selectedObject.position.z += dir * increment;
      }
      // Update the UI after movement
      updateObjectEditorUI();
    });
  });
}

export function editorClickHandler(event, gameInstance) {
  event.preventDefault();
  // Only process clicks in build mode. In select mode, allow selection.
  const editorSubMode = gameInstance.editorSubMode || 'build';
  const mouse = new THREE.Vector2();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, gameInstance.camera);

  if(editorSubMode === 'select') {
    // Try to select an existing editable object
    const intersects = raycaster.intersectObjects(gameInstance.scene.children, true);
    for (let intersect of intersects) {
      if (intersect.object.userData.editable) {
        setSelectedObject(intersect.object);
        return;
      }
    }
    // If nothing selected, clear selection
    clearSelectedObject();
  } else {
    // Build mode: create new object if click does not hit an editable object
    const intersects = raycaster.intersectObjects(gameInstance.scene.children, true);
    for (let intersect of intersects) {
      if (intersect.object.userData.editable) {
        // In build mode we do not select objects.
        return;
      }
    }
    // Intersect with ground plane (y=0)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    if(!intersectPoint) return;
    
    switch(selectedObjectType) {
      case "platform":
        {
          const width = 2, height = 0.3, depth = 2;
          const geometry = new THREE.BoxGeometry(width, height, depth);
          const material = new THREE.MeshPhongMaterial({ color: selectedColor });
          const platform = new THREE.Mesh(geometry, material);
          platform.position.copy(intersectPoint);
          platform.position.y += height/2; // lift so it sits on the ground
          platform.castShadow = true;
          platform.receiveShadow = true;
          platform.userData.editable = true;
          gameInstance.scene.add(platform);
          gameInstance.platforms.push(platform);
        }
        break;
      case "spawn":
        {
          const spawnGeometry = new THREE.SphereGeometry(0.2, 12, 12);
          const spawnMaterial = new THREE.MeshBasicMaterial({ color: selectedColor });
          const spawnMarker = new THREE.Mesh(spawnGeometry, spawnMaterial);
          spawnMarker.position.copy(intersectPoint);
          spawnMarker.position.y += 0.2;
          spawnMarker.userData.editable = true;
          gameInstance.scene.add(spawnMarker);
        }
        break;
      case "key":
        {
          // Remove old key if exists, then add new key at clicked position.
          if(gameInstance.key) {
            gameInstance.scene.remove(gameInstance.key);
          }
          const keyGroup = new THREE.Group();
          const headGeometry = new THREE.TorusGeometry(0.2, 0.05, 16, 32);
          const keyMaterial = new THREE.MeshPhongMaterial({ color: selectedColor });
          const head = new THREE.Mesh(headGeometry, keyMaterial);
          head.rotation.x = Math.PI / 2;
          keyGroup.add(head);
          const shaftGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
          const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
          shaft.position.x = -0.3;
          keyGroup.add(shaft);
          const toothGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
          [-0.4, -0.5].forEach(x => {
            const tooth = new THREE.Mesh(toothGeometry, keyMaterial);
            tooth.position.set(x, -0.12, 0);
            keyGroup.add(tooth);
          });
          keyGroup.position.copy(intersectPoint);
          keyGroup.position.y += 0.5;
          keyGroup.castShadow = true;
          keyGroup.userData.editable = true;
          gameInstance.key = keyGroup;
          gameInstance.scene.add(keyGroup);
        }
        break;
      case "door":
        {
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
          doorGroup.userData.editable = true;
          gameInstance.door = doorGroup;
          gameInstance.scene.add(doorGroup);
        }
        break;
      default:
        break;
    }
    // In build mode, we do not update selection
    clearSelectedObject();
  }
}

function setSelectedObject(object) {
  // Remove previous highlight if any
  clearSelectedObject();
  selectedObject = object;
  // To visually indicate selection, add an outline or change emissive color
  if (selectedObject.material && selectedObject.material.emissive) {
    selectedObject.material.emissive.setHex(0x333333);
  }
  // Update UI with object's current position
  updateObjectEditorUI();
  // Show the object editor panel if in select mode
  document.getElementById('objectEditor').style.display = "block";
}

function clearSelectedObject() {
  if (selectedObject && selectedObject.material && selectedObject.material.emissive) {
    // Remove highlight
    selectedObject.material.emissive.setHex(0x000000);
  }
  selectedObject = null;
  document.getElementById('objectEditor').style.display = "none";
}

function updateObjectEditorUI() {
  if (selectedObject) {
    document.getElementById('posX').value = selectedObject.position.x.toFixed(2);
    document.getElementById('posY').value = selectedObject.position.y.toFixed(2);
    document.getElementById('posZ').value = selectedObject.position.z.toFixed(2);
  }
}