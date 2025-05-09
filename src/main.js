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
// Create the dice with rounded edges and dot markings
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
  // Using smaller radius for dots
  dotGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const dotMaterialBlack = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    roughness: 0.3,
    metalness: 0.2
  }); // Black dots
  
  const dotMaterialRed = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    roughness: 0.3,
    metalness: 0.2
  }); // Red dots
  
  // Face positioning values - distance from center to face
  const faceOffset = 0.475; // Slightly less than half width to account for rounded edges
  
  // Face 1: Single dot (center) [+Z face]
  addDotOnSurface(0, 0, faceOffset, dotMaterialRed);
  
  // Face 2: Two dots [+X face]
  addDotOnSurface(faceOffset, 0.25, 0, dotMaterialBlack);
  addDotOnSurface(faceOffset, -0.25, 0, dotMaterialRed);
  
  // Face 3: Three dots [-Z face]
  addDotOnSurface(0, 0.25, -faceOffset, dotMaterialBlack);
  addDotOnSurface(0, 0, -faceOffset, dotMaterialRed);
  addDotOnSurface(0, -0.25, -faceOffset, dotMaterialBlack);
  
  // Face 4: Four dots [-X face]
  addDotOnSurface(-faceOffset, 0.25, 0.25, dotMaterialRed);
  addDotOnSurface(-faceOffset, 0.25, -0.25, dotMaterialBlack);
  addDotOnSurface(-faceOffset, -0.25, 0.25, dotMaterialBlack);
  addDotOnSurface(-faceOffset, -0.25, -0.25, dotMaterialRed);
  
  // Face 5: Five dots [+Y face]
  addDotOnSurface(0, faceOffset, 0, dotMaterialRed);
  addDotOnSurface(0.25, faceOffset, 0.25, dotMaterialBlack);
  addDotOnSurface(0.25, faceOffset, -0.25, dotMaterialRed);
  addDotOnSurface(-0.25, faceOffset, 0.25, dotMaterialBlack);
  addDotOnSurface(-0.25, faceOffset, -0.25, dotMaterialRed);
  
  // Face 6: Six dots [-Y face]
  addDotOnSurface(0.25, -faceOffset, 0.25, dotMaterialBlack);
  addDotOnSurface(0.25, -faceOffset, 0, dotMaterialRed);
  addDotOnSurface(0.25, -faceOffset, -0.25, dotMaterialBlack);
  addDotOnSurface(-0.25, -faceOffset, 0.25, dotMaterialRed);
  addDotOnSurface(-0.25, -faceOffset, 0, dotMaterialBlack);
  addDotOnSurface(-0.25, -faceOffset, -0.25, dotMaterialRed);
}

// Add a dot that conforms to the curved surface of the dice
function addDotOnSurface(x, y, z, material) {
  // Create the dot
  const dot = new THREE.Mesh(dotGeometry, material);
  
  // Find direction from center to position
  const direction = new THREE.Vector3(x, y, z).normalize();
  
  // Calculate position on the rounded surface
  const cubeSize = 0.95; // Must match the dice size
  const cornerRadius = 0.15; // Must match the corner radius used for the dice
  
  // Determine which components are at the edges
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);
  const maxComponent = Math.max(absX, absY, absZ);
  
  // Base position - this is where the dot would be on a perfect cube
  const basePosition = new THREE.Vector3(x, y, z);
  
  // Adjust for rounded corners if near an edge or corner
  if (maxComponent > (cubeSize / 2) - cornerRadius) {
    // Edge distance
    const edge = (cubeSize / 2) - cornerRadius;
    
    // Calculate how much we need to move the point inward
    const scale = edge / maxComponent;
    
    // Move point inward
    const adjustedPos = new THREE.Vector3(
      x * scale,
      y * scale,
      z * scale
    );
    
    // Add the corner radius in the direction from center
    const cornerOffset = direction.clone().multiplyScalar(cornerRadius);
    basePosition.copy(adjustedPos).add(cornerOffset);
  }
  
  // Set the dot position
  dot.position.copy(basePosition);
  
  // Orient the dot to look outward from center
  dot.lookAt(dot.position.clone().add(direction));
  
  // Add a small offset to prevent z-fighting
  dot.position.add(direction.clone().multiplyScalar(0.002));
  
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

// Setup gradient effects for project grid
function setupProjectGridEffects() {
  // Add CSS for the gradient animation
  const styleSheet = document.createElement('style');
  styleSheet.id = 'gradient-hover-style';
  styleSheet.textContent = `
    @keyframes gradientBG {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    .project-card,
    .achievement-card {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      z-index: 1;
      overflow: hidden;
    }
    
    .project-card::before,
    .achievement-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, 
        #ff6b6b, #6c63ff, #48dbfb, #1dd1a1, #feca57, #ff9ff3);
      background-size: 300% 300%;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
      border-radius: 15px;
    }
    
    .project-card:hover::before,
    .achievement-card:hover::before {
      opacity: 1;
      animation: gradientBG 3s ease infinite;
    }
    
    .project-card:hover,
    .achievement-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 30px rgba(108, 99, 255, 0.2);
    }
    
    .project-card:hover .project-card-content,
    .achievement-card:hover .achievement-card-content {
      background: rgba(255, 255, 255, 0.9);
      border-radius: 15px;
    }
    
    .project-card-content,
    .achievement-card-content {
      position: relative;
      z-index: 2;
      padding: 20px;
      transition: background 0.3s ease;
    }
  `;
  document.head.appendChild(styleSheet);
  
  // Create project grid if it doesn't exist
  createProjectGridIfNeeded();
  
  console.log("Project grid hover effects initialized");
}

// Create project grid if needed
function createProjectGridIfNeeded() {
  // Check if a project section exists, if not create it
  if (!document.getElementById('projects')) {
    // Create project section element
    const projectSection = document.createElement('section');
    projectSection.id = 'projects';
    projectSection.className = 'section';
    
    // Find a suitable container for the section
    const contentSections = document.getElementById('content-sections') || document.body;
    contentSections.appendChild(projectSection);
    
    // Add to sections array if it exists
    if (typeof sections !== 'undefined') {
      sections.push('projects');
    }
    
    // Add CSS for project grid
    const projectGridStyle = document.createElement('style');
    projectGridStyle.id = 'project-grid-style';
    projectGridStyle.textContent = `
      .projects-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
      }
      
      .project-card {
        background-color: var(--white);
        border-radius: 15px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      
      .project-tech {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      
      .project-tech span {
        background-color: rgba(108, 99, 255, 0.1);
        color: var(--primary-color);
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
      }
    `;
    document.head.appendChild(projectGridStyle);
  }
}

// Add a function to show a message when the roll dice button is visible
function setupRollDiceMessage() {
  const rollDiceBtn = document.getElementById('roll-dice');
  if (!rollDiceBtn) return;
  
  // Create a tooltip element
  const tooltip = document.createElement('div');
  tooltip.id = 'roll-dice-tooltip';
  tooltip.textContent = 'Roll the dice to navigate!';
  tooltip.style.cssText = `
    position: fixed;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.9rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 100;
  `;
  document.body.appendChild(tooltip);
  
  // Show tooltip when dice is idle for a few seconds
  let tooltipTimeout;
  
  function showTooltip() {
    if (!isRolling) {
      tooltip.style.opacity = '1';
      
      // Hide after a few seconds
      setTimeout(() => {
        tooltip.style.opacity = '0';
      }, 1500);
    }
  }
  
  // Show tooltip every 15 seconds if dice is visible and not rolling
  setInterval(() => {
    const diceVisible = window.getComputedStyle(canvas).display !== 'none';
    if (diceVisible && !isRolling) {
      showTooltip();
    }
  }, 4000);
  
  // Also show when mouse hovers near the dice
  canvas.addEventListener('mousemove', () => {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(showTooltip, 1000);
  });
  
  // Hide when dice starts rolling
  const originalRollDice = window.rollDice || function() {};
  window.rollDice = function() {
    tooltip.style.opacity = '0';
    originalRollDice.apply(this, arguments);
  };
}

// Setup the roll dice message after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupRollDiceMessage();
});

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
