// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BoxGeometry } from 'three';

// DOM Elements
let canvas, container, rollDiceBtn, navLinks, hamburger, navMenu, loadingScreen;

// Ensure DOM is ready before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  // Create canvas element if it doesn't exist
  canvas = document.querySelector('#dice-canvas') || document.createElement('canvas');
  canvas.id = 'dice-canvas';
  
  // Get container element or create one
  container = document.getElementById('canvas-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'canvas-container';
    document.body.appendChild(container);
  }
  
  // Style container
  container.style.width = '100%';
  container.style.height = '400px';
  container.style.position = 'relative';
  
  // Append canvas to container if not already there
  if (!container.contains(canvas)) {
    container.appendChild(canvas);
  }
  
  // Get other DOM elements or create placeholders
  rollDiceBtn = document.getElementById('roll-dice') || document.createElement('button');
  navLinks = document.querySelectorAll('.nav-item') || [];
  hamburger = document.querySelector('.hamburger') || document.createElement('div');
  navMenu = document.querySelector('.nav-links') || document.createElement('div');
  loadingScreen = document.getElementById('loading') || document.createElement('div');
  
  // Initialize the scene
  init();

  // Create the dice
  createDice();

  // Start animation loop
  animate();
  
  // Hide loading screen after everything is loaded
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = 0;
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }, 1000);
  
  // Create introduction section if it doesn't exist
  createIntroductionSection();
  
  // Setup download CV link event tracking
  setupDownloadCVTracking();
});

// Create introduction section if it doesn't exist
function createIntroductionSection() {
  if (!document.getElementById('introduction')) {
    const introSection = document.createElement('section');
    introSection.id = 'introduction';
    introSection.className = 'section active';
    introSection.innerHTML = `
      <div class="section-content">
        <h2>Introduction</h2>
        <p>Welcome to my interactive portfolio! Click on the dice or use the navigation to explore different sections.</p>
        <p>Roll the dice to randomly navigate through my skills, experience, achievements, education, and contact information.</p>
        <div class="cta-buttons">
          <a href="https://example.com/your-cv.pdf" id="download-cv" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Download CV</a>
        </div>
      </div>
    `;
    
    // Find a suitable container for the section
    const mainContent = document.querySelector('main') || document.body;
    mainContent.appendChild(introSection);
    
    // Add styling for the download button
    addDownloadButtonStyles();
    
    console.log("Introduction section created with CV download button");
  }
}

// Add CSS styles for the download button
function addDownloadButtonStyles() {
  if (!document.getElementById('download-button-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'download-button-styles';
    styleEl.textContent = `
      .cta-buttons {
        margin-top: 2rem;
      }
      .btn {
        display: inline-block;
        padding: 10px 20px;
        border-radius: 4px;
        text-decoration: none;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      .btn-primary {
        background-color: #6c63ff;
        color: white;
        border: 2px solid #6c63ff;
      }
      .btn-primary:hover {
        background-color: #5a52d5;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(styleEl);
  }
}

// Sections mapping - corresponds to dice faces
const sections = [
  'introduction',
  'skills',
  'experience',
  'achievement',
  'education',
  'connect'
];

// ThreeJS Variables
let camera, scene, renderer, controls;
let dice, diceGeometry, diceMaterial, diceBorder, dotGeometry, dotMaterial;
let composer, bloomPass;
let isRolling = false;
let targetQuaternion = new THREE.Quaternion();
let currentSection = 'introduction';
let targetSection = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Initialize Three.js scene
function init() {
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9f9f9);
  
  // Camera setup - moved further back for better view
  camera = new THREE.PerspectiveCamera(50, 
    container.clientWidth / container.clientHeight, 
    0.1, 1000);
  camera.position.set(0, 0, 5);
  
  // Renderer setup
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true,
    alpha: true 
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Add a ground plane for shadow casting
  const groundGeometry = new THREE.PlaneGeometry(10, 10);
  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  scene.add(ground);
  
  // Lighting setup - improved for better visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.mapSize.set(2048, 2048);
  scene.add(directionalLight);
  
  const pointLight = new THREE.PointLight(0x6c63ff, 2, 100);
  pointLight.position.set(0, 3, 0);
  scene.add(pointLight);
  
  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 3;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;
  
  // Post-processing
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    0.5,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  composer.addPass(bloomPass);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Mouse click event for dice interaction
  renderer.domElement.addEventListener('click', onMouseClick);
  
  // Add roll dice button event listener
  if (rollDiceBtn) {
    rollDiceBtn.addEventListener('click', () => {
      // Choose random section different from current
      let availableSections = [...sections];
      if (sections.indexOf(currentSection) !== -1) {
        availableSections.splice(sections.indexOf(currentSection), 1);
      }
      targetSection = availableSections[Math.floor(Math.random() * availableSections.length)];
      rollDice();
    });
  }
  
  // Navigation click events
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('data-section');
      
      if (sectionId !== currentSection) {
        targetSection = sectionId;
        rollDice();
      }
      
      // Close mobile menu if open
      if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
      }
    });
  });
  
  // Hamburger menu toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });
}

// Create the dice with rounded edges and dot markings
// Find and update the dice material section in createDice() function
function createDice() {
  // Create a group for the dice
  dice = new THREE.Group();
  scene.add(dice);
  
  // Create rounded cube using BoxGeometry with more segments for rounded edges
  const cubeSize = 0.95; // Slightly smaller to fit within border
  diceGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize, 4, 4, 4);
  
  // Round the edges by moving vertices
  const positionAttribute = diceGeometry.attributes.position;
  const cornerRadius = 0.15; // Adjust for more or less rounding
  
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);
    
    // Calculate the distance from the vertex to the center of the cube
    const distance = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    
    if (distance > (cubeSize / 2) - cornerRadius) {
      // Direction vector from center to vertex (normalize)
      const direction = new THREE.Vector3(x, y, z).normalize();
      
      // Scale the direction vector to keep vertex on or within the rounded corner
      const edge = (cubeSize / 2) - cornerRadius;
      const frac = edge / distance;
      
      // New position after rounding
      positionAttribute.setXYZ(
        i,
        x * frac + direction.x * cornerRadius * (1 - frac),
        y * frac + direction.y * cornerRadius * (1 - frac),
        z * frac + direction.z * cornerRadius * (1 - frac)
      );
    }
  }
  
  // Update the geometry after modification
  positionAttribute.needsUpdate = true;
  diceGeometry.computeVertexNormals();
  
  // Dice material - changed to light blue color
  diceMaterial = new THREE.MeshPhongMaterial({
    color: 0xadd8e6, // Light blue color (hex: #ADD8E6)
    specular: 0x333333,
    shininess: 30,
    side: THREE.DoubleSide
  });
  
  // Create the inner light blue dice
  const innerDice = new THREE.Mesh(diceGeometry, diceMaterial);
  innerDice.castShadow = true;
  innerDice.receiveShadow = true;
  dice.add(innerDice);
  
  // Create border/outline for the dice with grey material
  const borderGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02, 4, 4, 4);
  // Create border/outline for the dice with the same light blue color
  const borderMaterial = new THREE.MeshPhongMaterial({
    color: 0xadd8e6, // Light blue color (same as inner dice)
    side: THREE.BackSide, // BackSide to create outline effect
    transparent: true,
    opacity: 0.9
  });
  
  // Apply same rounding to border geometry
  const borderPositionAttribute = borderGeometry.attributes.position;
  const borderCornerRadius = 0.17; // Slightly larger than inner dice corner radius
  
  for (let i = 0; i < borderPositionAttribute.count; i++) {
    const x = borderPositionAttribute.getX(i);
    const y = borderPositionAttribute.getY(i);
    const z = borderPositionAttribute.getZ(i);
    
    const distance = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    
    if (distance > (1.02 / 2) - borderCornerRadius) {
      const direction = new THREE.Vector3(x, y, z).normalize();
      const edge = (1.02 / 2) - borderCornerRadius;
      const frac = edge / distance;
      
      borderPositionAttribute.setXYZ(
        i,
        x * frac + direction.x * borderCornerRadius * (1 - frac),
        y * frac + direction.y * borderCornerRadius * (1 - frac),
        z * frac + direction.z * borderCornerRadius * (1 - frac)
      );
    }
  }
  
  borderPositionAttribute.needsUpdate = true;
  borderGeometry.computeVertexNormals();
  
  diceBorder = new THREE.Mesh(borderGeometry, borderMaterial);
  diceBorder.castShadow = true;
  dice.add(diceBorder);
  
  // Create dots for the dice faces
  createDiceDots();
  
  // Initial position
  dice.rotation.set(
    Math.PI / 4,
    Math.PI / 6,
    0
  );
  
  // Add debug info
  console.log("Dice created:", dice);
}

// Create the dots for each face of the dice
function createDiceDots() {
  dotGeometry = new THREE.CircleGeometry(0.07, 32);
  dotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black dots
  
  // Face 1: Single dot (center) [+Z face]
  addDot(0, 0, 0.501, 0, 0, 0);
  
  // Face 2: Two dots [+X face]
  addDot(0.501, 0.25, 0, Math.PI / 2, 0, 0);
  addDot(0.501, -0.25, 0, Math.PI / 2, 0, 0);
  
  // Face 3: Three dots [-Z face]
  addDot(0, 0.25, -0.501, 0, Math.PI, 0);
  addDot(0, 0, -0.501, 0, Math.PI, 0);
  addDot(0, -0.25, -0.501, 0, Math.PI, 0);
  
  // Face 4: Four dots [-X face]
  addDot(-0.501, 0.25, 0.25, -Math.PI / 2, 0, 0);
  addDot(-0.501, 0.25, -0.25, -Math.PI / 2, 0, 0);
  addDot(-0.501, -0.25, 0.25, -Math.PI / 2, 0, 0);
  addDot(-0.501, -0.25, -0.25, -Math.PI / 2, 0, 0);
  
  // Face 5: Five dots [+Y face]
  addDot(0, 0.501, 0, 0, 0, -Math.PI / 2);
  addDot(0.25, 0.501, 0.25, 0, 0, -Math.PI / 2);
  addDot(0.25, 0.501, -0.25, 0, 0, -Math.PI / 2);
  addDot(-0.25, 0.501, 0.25, 0, 0, -Math.PI / 2);
  addDot(-0.25, 0.501, -0.25, 0, 0, -Math.PI / 2);
  
  // Face 6: Six dots [-Y face]
  addDot(0.25, -0.501, 0.25, 0, 0, Math.PI / 2);
  addDot(0.25, -0.501, 0, 0, 0, Math.PI / 2);
  addDot(0.25, -0.501, -0.25, 0, 0, Math.PI / 2);
  addDot(-0.25, -0.501, 0.25, 0, 0, Math.PI / 2);
  addDot(-0.25, -0.501, 0, 0, 0, Math.PI / 2);
  addDot(-0.25, -0.501, -0.25, 0, 0, Math.PI / 2);
}

// Add a dot to the dice
function addDot(x, y, z, rotX, rotY, rotZ) {
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  dot.position.set(x, y, z);
  dot.rotation.set(rotX, rotY, rotZ);
  dice.add(dot);
}

// Roll the dice to a specific face
function rollDice() {
  if (isRolling) return;
  
  isRolling = true;
  console.log("Rolling dice to section:", targetSection);
  
  // Random rotations for effect
  const tempQuaternion = new THREE.Quaternion();
  tempQuaternion.setFromEuler(new THREE.Euler(
    Math.random() * Math.PI * 10,
    Math.random() * Math.PI * 10,
    Math.random() * Math.PI * 10
  ));
  
  // Determine which face to show (1-6)
  const sectionIndex = sections.indexOf(targetSection || 'introduction');
  const faceIndex = sectionIndex !== -1 ? sectionIndex : 0;
  
  // Set target rotation based on which face we want to show
  switch (faceIndex) {
    case 0: // Face 1 (top) - Introduction - showing 1 dot
      targetQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      break;
    case 1: // Face 2 (right) - Skills - showing 2 dots
      targetQuaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
      break;
    case 2: // Face 3 (back) - Experience - showing 3 dots
      targetQuaternion.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
      break;
    case 3: // Face 4 (left) - Achievement - showing 4 dots
      targetQuaternion.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
      break;
    case 4: // Face 5 (front) - Education - showing 5 dots
      targetQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      break;
    case 5: // Face 6 (bottom) - Connect - showing 6 dots
      targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      break;
  }
  
  // Animate the dice rolling
  const diceRoll = {
    progress: 0,
    initialQuaternion: dice.quaternion.clone()
  };
  
  // Use animation loop to animate
  const duration = 2.0;
  const start = Date.now();
  
  function updateRoll() {
    const elapsed = (Date.now() - start) / 1000;
    const progress = Math.min(elapsed / duration, 1);
    
    // First half - random rotation
    if (progress < 0.5) {
      const spin = progress * 2; // 0 to 1
      dice.quaternion.slerpQuaternions(
        diceRoll.initialQuaternion,
        tempQuaternion,
        spin
      );
    } 
    // Second half - settle to target face
    else {
      const settle = (progress - 0.5) * 2; // 0 to 1
      dice.quaternion.slerpQuaternions(
        tempQuaternion,
        targetQuaternion,
        settle
      );
    }
    
    if (progress < 1) {
      requestAnimationFrame(updateRoll);
    } else {
      isRolling = false;
      
      // Change the section after roll completes
      if (targetSection) {
        switchSection(targetSection);
        targetSection = null;
      }
    }
  }
  
  updateRoll();
}

// Switch to a different section
function switchSection(sectionId) {
  // Hide current section
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show new section
  const newSection = document.getElementById(sectionId);
  if (newSection) {
    newSection.classList.add('active');
    currentSection = sectionId;
    
    // Update navigation highlighting
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === sectionId) {
        link.classList.add('active');
      }
    });
  } else {
    console.warn(`Section ${sectionId} not found in the DOM`);
    
    // If it's introduction and missing, try to create it
    if (sectionId === 'introduction') {
      createIntroductionSection();
    }
  }
}

// Handle mouse click on dice
function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(dice, true);
  
  if (intersects.length > 0 && !isRolling) {
    console.log("Dice clicked!");
    // Determine closest face
    const faceIndex = Math.floor(Math.random() * 6);
    targetSection = sections[faceIndex];
    rollDice();
  }
}

// Handle window resize
function onWindowResize() {
  if (container) {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
  }
}

// Setup tracking for CV download link
function setupDownloadCVTracking() {
  const downloadLink = document.getElementById('download-cv');
  if (downloadLink) {
    downloadLink.addEventListener('click', (e) => {
      // You can add analytics tracking here
      console.log('CV download clicked');
      
      // If you want to customize the download link URL dynamically
      const cvUrl = downloadLink.getAttribute('href');
      
      // Optional: Update the URL with a query parameter for tracking
      if (!cvUrl.includes('?source=')) {
        downloadLink.setAttribute('href', `${cvUrl}?source=portfolio-dice`);
      }
      
      // If you want to handle the download programmatically instead of using the default link behavior
      // e.preventDefault();
      // window.open(cvUrl, '_blank');
    });
  }
}

// Set custom CV download URL
function setCustomCVUrl(url) {
  const downloadLink = document.getElementById('download-cv');
  if (downloadLink && url) {
    downloadLink.setAttribute('href', url);
    console.log(`CV download URL set to: ${url}`);
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.update();
  
  // Gentle idle animation when not rolling
  if (!isRolling && dice) {
    dice.rotation.y += 0.002;
    dice.rotation.x += 0.001;
  }
  
  // Render scene
  composer.render();
}