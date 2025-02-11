import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

// Global variables for editor
let selectedObjectType = 'platform';
let selectedColor = 0x505050;
let selectedObject = null;
// Create a variable to hold TransformControls instance
let transformControl = null;

export function clearSelectedObjectExternal() {
  clearSelectedObject();
}

window.clearSelectedObject = clearSelectedObjectExternal;

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
    // Reset selectors to defaults
    objectTypeSelect.value = 'platform';
    selectedObjectType = 'platform';
    colorPicker.value = "#505050";
    selectedColor = 0x505050;
    clearSelectedObject();
  });

  // Initialize TransformControls for object manipulation
  transformControl = new TransformControls(gameInstance.camera, gameInstance.renderer.domElement);
  transformControl.addEventListener('dragging-changed', function (event) {
    // When dragging, disable orbit controls if they exist
    gameInstance.renderer.domElement.style.cursor = event.value ? 'grabbing' : 'pointer';
  });
  
  // Make transform control more responsive
  transformControl.setTranslationSnap(0.5);
  transformControl.setRotationSnap(THREE.MathUtils.degToRad(15));
  transformControl.setScaleSnap(0.25);
  
  // Enable all transform modes
  transformControl.showX = true;
  transformControl.showY = true;
  transformControl.showZ = true;
  
  // Add to scene but hide initially
  transformControl.visible = false;
  gameInstance.scene.add(transformControl);
  
  // Store reference globally for other parts of the UI
  window.transformControl = transformControl;
  
  // Add event listener for transform changes
  transformControl.addEventListener('objectChange', function() {
    if (selectedObject) {
      // Update object position when transformed
      selectedObject.position.copy(transformControl.object.position);
      selectedObject.rotation.copy(transformControl.object.rotation);
      selectedObject.scale.copy(transformControl.object.scale);
    }
  });
}

export function editorClickHandler(event, gameInstance) {
  event.preventDefault();
  // Only process clicks in the editor modes.
  const editorSubMode = gameInstance.editorSubMode || 'select';
  const mouse = new THREE.Vector2();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, gameInstance.camera);

  if(editorSubMode === 'select') {
    // Try to select any clickable object in the scene.
    const intersects = raycaster.intersectObjects(gameInstance.scene.children, true);
    for (let intersect of intersects) {
      // Check through the object's parent chain if necessary to find a selectable object
      let candidate = intersect.object;
      while (candidate && !candidate.userData.hasOwnProperty('editable')) {
        candidate = candidate.parent;
      }
      if (candidate && candidate.material) {
        setSelectedObject(candidate, gameInstance);
        return;
      }
    }
    // If nothing selected, clear selection
    clearSelectedObject();
  } else {
    // Build mode: create new object if click does not hit an existing selectable object
    const intersects = raycaster.intersectObjects(gameInstance.scene.children, true);
    for (let intersect of intersects) {
      if (intersect.object.material) {
        // If clicked on an existing object, do not build.
        return;
      }
    }
    // Intersect with ground plane (y=0)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    if(!intersectPoint) return;
    
    switch(selectedObjectType) {
      case "platform": {
          const width = 2, height = 0.3, depth = 2;
          const geometry = new THREE.BoxGeometry(width, height, depth);
          const material = new THREE.MeshPhongMaterial({ color: selectedColor });
          const platform = new THREE.Mesh(geometry, material);
          platform.position.copy(intersectPoint);
          platform.position.y += height/2;
          platform.castShadow = true;
          platform.receiveShadow = true;
          // Mark newly built objects as editable
          platform.userData.editable = true;
          gameInstance.scene.add(platform);
          gameInstance.platforms.push(platform);
        }
        break;
      case "spawn": {
          const spawnGeometry = new THREE.SphereGeometry(0.2, 12, 12);
          const spawnMaterial = new THREE.MeshBasicMaterial({ color: selectedColor });
          const spawnMarker = new THREE.Mesh(spawnGeometry, spawnMaterial);
          spawnMarker.position.copy(intersectPoint);
          spawnMarker.position.y += 0.2;
          spawnMarker.userData.editable = true;
          gameInstance.scene.add(spawnMarker);
        }
        break;
      case "key": {
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
      case "door": {
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

function setSelectedObject(object, gameInstance) {
  // Clear previous selection
  clearSelectedObject();
  
  selectedObject = object;
  
  // Visual indication of selection
  if (selectedObject.material && selectedObject.material.emissive) {
    selectedObject.material.emissive.setHex(0x333333);
  }
  
  // Attach transform controls
  if (transformControl) {
    transformControl.attach(selectedObject);
    transformControl.visible = true;
    
    // Set initial transform mode to translate
    transformControl.setMode('translate');
    
    // Make sure the transform control is in front of other objects
    transformControl.position.copy(selectedObject.position);
  }
}

function clearSelectedObject() {
  if (selectedObject && selectedObject.material && selectedObject.material.emissive) {
    selectedObject.material.emissive.setHex(0x000000);
  }
  selectedObject = null;
  if (transformControl) {
    transformControl.detach();
    transformControl.visible = false;
  }
}