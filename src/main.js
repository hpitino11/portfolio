import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/Addons.js';

const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const xAxisFans = [];
const yAxisFans = [];
const raycasterObjects = []; // Array to hold meshes for interaction
let currentIntersects = [];
let currentHoveredObject = null; // Currently hovered mesh

// Global Raycaster and Pointer for interaction.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let chairTop;
let pufferfish;

// Loading screen elements
const loadingScreen = document.querySelector(".loading-screen");
const progressBarFill = document.getElementById("loading-bar-fill");

// Real LoadingManager to track asset loading
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const percent = (itemsLoaded / itemsTotal) * 100;
  progressBarFill.style.width = `${percent}%`;
};

loadingManager.onLoad = () => {
  loadingScreen.style.opacity = 0;
  setTimeout(() => { loadingScreen.style.display = "none"; }, 800);
};

// Loaders with manager
const textureLoader = new THREE.TextureLoader(loadingManager);
const environmentMap = new THREE.CubeTextureLoader(loadingManager)
  .setPath("textures/skybox/")
  .load(["nx.webp", "ny.webp", "nz.webp", "px.webp", "py.webp", "pz.webp"]);

const textureMap = {
  First: { day: "/textures/Texture Set 1.webp" },
  Second: { day: "/textures/Texture Set 2.webp" }
};
const loadedTextures = { day: {} };

Object.entries(textureMap).forEach(([key, paths]) => {
  const dayTexture = textureLoader.load(paths.day);
  loadedTextures.day[key] = dayTexture;
});

// video texture loader (does not affect LoadingManager progress)
const videoElement = document.createElement("video");
videoElement.src = "/textures/video/Monitor.mp4";
videoElement.loop = true;
videoElement.muted = true;
videoElement.playsInline = true;
videoElement.autoplay = true;
videoElement.play();

const videoTexture = new THREE.VideoTexture(videoElement);
videoTexture.colorSpace = THREE.SRGBColorSpace;

// Model loader with Draco
const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath('/draco/');
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);

// Scene, camera, renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 400);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 5;
controls.maxDistance = 45;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minAzimuthAngle = 0;
controls.maxAzimuthAngle = Math.PI / 2;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

camera.position.set(16.08716308085236, 17.966032654269572, 15.399105127662553);
controls.target.set(-0.3115066914879522, 14.004804443188336, -9.981614022161127);

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
});

// GLTF model load
loader.load("/models/roomfolio.glb", (glb) => {
  glb.scene.traverse(child => {
    if (child.isMesh) {
      // your mesh-specific logic (Puffer, Chair_top, Water, Glass, MonitorScreen, Fans)
      // ... same as before ...
      if (child.name.includes("Puffer")) {
        pufferfish = child;
        child.position.x += 0.04;
        child.position.z -= 0.03;
        child.userData.initialPosition = child.position.clone();
      }
      if (child.name.includes("Chair_top")) chairTop = child;
      if (child.name.includes("Water")) {
        child.material = new THREE.MeshBasicMaterial({ color: 0x558bc8, transparent: true, opacity: 0.2, depthWrite: false });
      } else if (child.name.includes("Glass")) {
        child.material = new THREE.MeshPhysicalMaterial({ transmission: 1, opacity: 1, metalness: 0, roughness: 0, ior: 1.5, thickness: 0.01, envMap: environmentMap, depthWrite: false });
      } else if (child.name.includes("MonitorScreen")) {
        child.material = new THREE.MeshBasicMaterial({ map: videoTexture });
      } else if (child.name.includes("Fan")) {
        if (/[0-9]_[0-9]/.test(child.name)) xAxisFans.push(child);
        else yAxisFans.push(child);
      } else {
        Object.keys(textureMap).forEach(key => {
          if (child.name.includes(key)) child.material = new THREE.MeshBasicMaterial({ map: loadedTextures.day[key] });
        });
      }
      if (/AboutMe|ContactMe|Projects_LED/.test(child.name)) raycasterObjects.push(child);
    }
  });
  scene.add(glb.scene);
});

// Render loop
const render = (timestamp) => {
  controls.update();
  if (chairTop) {
    const time = timestamp * 0.001;
    const amplitude = Math.PI / 8;
    const speed = 0.3;
    chairTop.rotation.y = Math.sin(time * speed) * amplitude;
  }
  if (pufferfish) {
    const time = timestamp * 0.001;
    pufferfish.position.y = pufferfish.userData.initialPosition.y + 0.1 * Math.sin(time) * (1 - Math.abs(Math.sin(time)) * 0.1);
  }
  yAxisFans.forEach(f => (f.rotation.z += -0.012));
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};
render();

// Interaction (hover, click) and popup helper functions remain unchanged
// … your existing hover/click and showPopup functions …



// --- Interaction: Hover and Click Handlers ---

// Mouse move event for hover effect (adding white outline)
window.addEventListener("mousemove", (event) => {
  // Convert mouse coordinates to normalized device coordinates (-1 to +1)
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
  
  // Update the raycaster with the pointer position and camera.
  raycaster.setFromCamera(pointer, camera);
  
  // Find intersections with our interactive objects.
  const intersects = raycaster.intersectObjects(raycasterObjects, true);
  
  if (intersects.length > 0) {
    const hovered = intersects[0].object;
    if (hovered.name.includes("AboutMe")) {
      if (currentHoveredObject !== hovered) {
        removeOutline(currentHoveredObject);
        currentHoveredObject = hovered;
        addOutline(currentHoveredObject);
      }
    } else {
      removeOutline(currentHoveredObject);
      currentHoveredObject = null;
    }
  } else {
    removeOutline(currentHoveredObject);
    currentHoveredObject = null;
  }
});

// Mouse click event for showing the popup
const canvasEl = document.querySelector("#experience-canvas");
canvasEl.addEventListener("click", (event) => {
  // update pointer from this click
  pointer.x = (event.clientX / canvasEl.clientWidth)  * 2 - 1;
  pointer.y = -(event.clientY / canvasEl.clientHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(raycasterObjects, true);
  if (intersects.length === 0) return;

  const clicked = intersects[0].object;
  if (clicked.name.includes("AboutMe")) {
    showAboutPopup();
  } else if (clicked.name.includes("ContactMe")) {
    showContactPopup();
  } else if (clicked.name.includes("Projects_LED")) {
  showProjectsPopup();
}
});


// --- Helper Functions ---

function addOutline(mesh) {
  if (!mesh) return;
  // Avoid adding multiple outlines
  if (mesh.userData.outlineMesh) return;
  
  // Clone the mesh (including its hierarchy) to create the outline mesh
  const outlineMesh = mesh.clone(true);
  // Apply a basic white material with back-face rendering and disable depth testing
  outlineMesh.material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    depthTest: false,
  });
  // Scale up slightly to create the outline effect
  outlineMesh.scale.multiplyScalar(2);
  // Optionally adjust render order to help prevent z-fighting issues
  outlineMesh.renderOrder = mesh.renderOrder - 1;
  // Add the outline as a child so it moves with the original mesh
  mesh.add(outlineMesh);
  mesh.userData.outlineMesh = outlineMesh;
}

function removeOutline(mesh) {
  if (!mesh || !mesh.userData.outlineMesh) return;
  
  // Remove the outline mesh
  mesh.remove(mesh.userData.outlineMesh);
  mesh.userData.outlineMesh = null;
}
function showAboutPopup() {
  let popup = document.getElementById("about-popup");

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "about-popup";
    popup.innerHTML = `
      <button class="close-button">×</button>
      <h2>about me !!</h2>
      <div class="about-grid">
        <div class="frame" id="frame1"><img src="/images/me1.png" alt="Photo 1"></div>
        <div class="bubble" id="bubble1">Hi! I'm Hanna Pitino, and I am a CS UCF student from Orlando!</div>
        <div class="frame" id="frame2"><img src="/images/me2.png" alt="Photo 2"></div>
        <div class="frame" id="frame3"><img src="/images/me3.png" alt="Photo 3"></div>
        <div class="bubble" id="bubble2">In my free time, I play FPS and indie horror games. I am passionate about combining software engineering with game design.</div>
        <div class="frame" id="frame4"><img src="/images/me4.jpg" alt="Photo 4"></div>
        <div class="bubble" id="bubble3">Thanks for checking out my website!</div>
        <div class="frame" id="frame5"><img src="/images/me5.jpg" alt="Photo 5"></div>
      </div>
    `;
    document.body.appendChild(popup);

    // close behavior
    popup.querySelector(".close-button").onclick = () => popup.classList.remove("visible");
  }

  popup.classList.add("visible");
}

function showContactPopup() {
  let popup = document.getElementById("contact-popup");

  // Check if the popup already exists. If not, create it.
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "contact-popup";
    popup.innerHTML = `
      <button class="close-button">×</button>
      <h2>Hanna Pitino</h2>
      <div class="contact-layout">
        <div class="contact-info">
          <p>
            Computer Science student at UCF<br><br>
            (561) 800-9423<br>
            hapitino@gmail.com<br>
            hannapitino.com
          </p>
        </div>
        <div class="contact-images">
          <img src="/images/c1.svg" alt="c1" id="c1-img">
          <img src="/images/c2.svg" alt="c2" id="c2-img">
          <img src="/images/c3.svg" alt="c3" id="c3-img">
          <img src="/images/c4.svg" alt="c4" id="c4-img">
          <img src="/images/c5.svg" alt="c5" id="c5-img">
          <img src="/images/c6.svg" alt="c6" id="c6-img">
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    popup.querySelector(".close-button").onclick = () => popup.classList.remove("visible");
  }

  // Add the "visible" class to show the popup
  popup.classList.add("visible");

  // Define clickable image URLs
  const clickableImages = [
    { id: "c1-img", url: "https://www.linkedin.com/in/hanna-pitino/" },
    { id: "c2-img", url: "https://github.com/hpitino11" },
    { id: "c3-img", url: "https://devpost.com/hapitino" },
    { id: "c4-img", url: "https://hannapitino.itch.io/veilrunner" },
    { id: "c5-img", url: "https://mail.google.com/mail/u/0/?fs=1&to=hapitino@gmail.com&tf=cm" },
    { id: "c6-img", url: "/documents/Resume.pdf" }
  ];

  // Set up click events for each image
  clickableImages.forEach(({ id, url }) => {
    const img = document.getElementById(id);
    if (img) {
      img.style.cursor = "pointer";
      img.onclick = () => window.open(url, "_blank");
    }
  });

}
document.body.addEventListener("click", e => {
  if (e.target.matches("#contact-popup .close-button")) {
    document.getElementById("contact-popup").classList.remove("visible");
  }
  if (e.target.matches("#about-popup .close-button")) {
    document.getElementById("about-popup").classList.remove("visible");
  }
});

function showProjectsPopup() {
  let popup = document.getElementById("projects-popup");
  if (!popup) {
    // Create the popup container
    popup = document.createElement("div");
    popup.id = "projects-popup";
    popup.innerHTML = `
      <div class="window-frame">
      <div class="solid-bar"></div>
    <div class="title-bar">
      <span class="title-label">Address:</span>
      <select class="address-select">
        <option value="">C:\\Users\\Hanna\\Projects</option>
      </select>
      <button class="close-button">×</button>
    </div>
    <div class="projects-grid">
        <div class="folder" id="folder1"><img src="/images/folder1.svg" alt="Folder 1"><span>Echoes Of Descent</span></div>
        <div class="folder" id="folder2"><img src="/images/folder1.svg" alt="Folder 2"><span>Veilrunner</span></div>
        <div class="folder" id="folder3"><img src="/images/folder1.svg" alt="Folder 3"><span>Find My Professors</span></div>
        <div class="folder" id="folder4"><img src="/images/folder1.svg" alt="Folder 4"><span>Roomfolio</span></div>
      </div>
      <div class="projects-grid">
        <div class="folder" id="folder5"><img src="/images/folder1.svg" alt="Folder 1"></div>
        <div class="folder" id="folder6"><img src="/images/folder1.svg" alt="Folder 2"></div>
        <div class="folder" id="folder7"><img src="/images/folder1.svg" alt="Folder 3"></div>
        <div class="folder" id="folder8"><img src="/images/folder1.svg" alt="Folder 4"></div>
      </div>
      <div class="projects-grid">
        <div class="folder" id="folder9"><img src="/images/folder1.svg" alt="Folder 1"></div>
        <div class="folder" id="folder10"><img src="/images/folder1.svg" alt="Folder 2"></div>
        <div class="folder" id="folder11"><img src="/images/folder1.svg" alt="Folder 3"></div>
        <div class="folder" id="folder12"><img src="/images/folder1.svg" alt="Folder 4"></div>
      </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Close button
    popup.querySelector(".close-button").onclick = () => popup.classList.remove("visible");

    ['folder1','folder2','folder3','folder4'].forEach(id => {
         const el = popup.querySelector(`#${id}`);
         if (!el) return;
         el.style.cursor = 'pointer';
         el.onclick = () => {
           switch(id) {
             case 'folder1': return showFolder1Popup();
             case 'folder2': return showFolder2Popup();
             case 'folder3': return showFolder3Popup();
             case 'folder4': return showFolder4Popup();
           }
         };
       });
      }
  // Always show the popup
  popup.classList.add("visible");
}


// main.js: update showFolder1Popup()

function showFolder1Popup() {
  showInfoPopup("folder1-info", "Echoes of Descent", `
    <div class="carousel">
      <span class="arrow prev">&#10094;</span>
      <span class="arrow next">&#10095;</span>
      <img src="/images/eod.PNG" alt="Screenshot 1">
      <img src="/images/eod2.PNG" alt="Screenshot 2">
      <img src="/images/eod3.PNG" alt="Screenshot 3">
      <img src="/images/eod4.PNG" alt="Screenshot 4">
    </div>
    <div class="folder1-text">
      <p><br></p>
      <p>Echoes of Descent is a 3D singleplayer puzzle horror game made in Unity. Players navigate through 5 intricately designed levels, ranging from caves to a haunted mansion by solving 7 unique puzzles. Six custom animated cutscenes, all voiced and animated by myself, enhance the player immersion.</p>
      <p>Key features of Echoes of Descent includes two different AI enemy types. The first being a priest that patrols the catacombs, and will be alerted if the player makes noise around them.</p>
      <p>The second enemy type is a weeping angel in the haunted mansion. Players must quickly gather VHS tapes and play them in the VHS player before ultimately getting caught by the haunted mannequin.</p>
      <p>This project showcases my skills in Unity scripting, AI behavior design, puzzle mechanics, and multimedia storytelling through voice acting and cinematic direction.</p>
    </div>
  `);

  const carousel = document.querySelector('#info-popup .carousel');
  if (!carousel) return;
  let idx = 0;
  const slides = Array.from(carousel.querySelectorAll('img'));
  const prev = carousel.querySelector('.prev');
  const next = carousel.querySelector('.next');

  // initialize slides
  slides.forEach((img, i) => {
    img.style.display = (i === 0 ? 'block' : 'none');
  });

  function showSlide(newIdx) {
    slides[idx].style.display = 'none';
    idx = (newIdx + slides.length) % slides.length;
    slides[idx].style.display = 'block';
  }

  prev.onclick = () => showSlide(idx - 1);
  next.onclick = () => showSlide(idx + 1);
}

function showFolder2Popup() {
  showInfoPopup("folder2-info", "Veilrunner", `
    <div class="carousel">
      <span class="arrow prev">&#10094;</span>
      <span class="arrow next">&#10095;</span>
      <img src="/images/vr1.PNG" alt="Screenshot 1">
      <img src="/images/vr2.PNG" alt="Screenshot 2">
      <img src="/images/vr3.PNG" alt="Screenshot 3">
      <img src="/images/vr4.PNG" alt="Screenshot 4">
      <img src="/images/vr5.PNG" alt="Screenshot 4">
      <img src="/images/vr6.PNG" alt="Screenshot 4">
    </div>
    <div class="folder1-text">
      <p><br></p>
      <p>Veilrunner is a 2.5D top-down ARPG auto-shooter survival game built in Unreal Engine 5. Set within a pre-built world, players are placed in the center of relentless enemy waves that spawn from all directions. While the character automatically targets and attacks the enemies, the player's challenge is to maneuver through the chaos, dodging incoming attacks and position themselves to maximize damage output.</p>
      <p>This game includes 3 different AI, basic, elite, and boss types. There are 27 basic enemies that act as fodder, 6 elite enemies with special moves, and 3 final bosses at the end of each level.</p>
      <p>My roles in this project included being project manager, lead AI designer, and map creator. As project manager I held bi-weekly meetings with my team where I delegated tasks and updated deadlines.</p>
      <p>As lead AI designer I documented all of the different AI that would be featured in the game and led my team through the implementation of each corresponding enemy AI.</p>
    </div>
  `);

  const carousel = document.querySelector('#info-popup .carousel');
  if (!carousel) return;
  let idx = 0;
  const slides = Array.from(carousel.querySelectorAll('img'));
  const prev = carousel.querySelector('.prev');
  const next = carousel.querySelector('.next');

  // initialize slides
  slides.forEach((img, i) => {
    img.style.display = (i === 0 ? 'block' : 'none');
  });

  function showSlide(newIdx) {
    slides[idx].style.display = 'none';
    idx = (newIdx + slides.length) % slides.length;
    slides[idx].style.display = 'block';
  }

  prev.onclick = () => showSlide(idx - 1);
  next.onclick = () => showSlide(idx + 1);
}
function showFolder3Popup() {
  showInfoPopup("folder3-info", "Find My Professors", `
    <div class="carousel">
      <span class="arrow prev">&#10094;</span>
      <span class="arrow next">&#10095;</span>
      <img src="/images/fmp1.PNG" alt="Screenshot 1">
      <img src="/images/fmp2.PNG" alt="Screenshot 2">
    </div>
    <div class="folder1-text">
      <p><br></p>
      <p>FindMyProfessors is a site that allows students to search for the professors by the course that
they want to take, instead of by the professor. This enables students to save time manually
searching for the best professor by using our site which runs an in-depth rating analysis on each
professor and presents all the relevant data to you. 
</p>
      <p>As the front‑end developer on this project, I built the UI using React Bootstrap and ensured a responsive, user‑friendly design. I also hooked up all authentication API endpoints directly to the front end. I wired in sign‑in, password reset, and email verification flows in order to deliver a seamless and secure login experience.</p>
    </div>
  `);

  const carousel = document.querySelector('#info-popup .carousel');
  if (!carousel) return;
  let idx = 0;
  const slides = Array.from(carousel.querySelectorAll('img'));
  const prev = carousel.querySelector('.prev');
  const next = carousel.querySelector('.next');

  // initialize slides
  slides.forEach((img, i) => {
    img.style.display = (i === 0 ? 'block' : 'none');
  });

  function showSlide(newIdx) {
    slides[idx].style.display = 'none';
    idx = (newIdx + slides.length) % slides.length;
    slides[idx].style.display = 'block';
  }

  prev.onclick = () => showSlide(idx - 1);
  next.onclick = () => showSlide(idx + 1);
}
function showFolder4Popup() {
  showInfoPopup("folder4-info", "Roomfolio", `
    <div class="carousel">
      <span class="arrow prev">&#10094;</span>
      <span class="arrow next">&#10095;</span>
      <img src="/images/r.png" alt="Screenshot 1">
      <img src="/images/r2.PNG" alt="Screenshot 2">
    </div>
    <div class="folder1-text">
      <p><br></p>
      <p>This is the project you are currently in right now!</p>
    <p>This space is more than just a portfolio — it showcases not only my technical skills but also who I am in an immersive 3D experience. I modeled the entire 3D room you see in Blender from scratch, complete with materials, UV painting, and texture baking. I then brought it to the web using Three.js.</p>
    <p>By using my background in front-end development I crafted the layout of the website itself using generic JavaScript and HTML/CSS. Just like how someone's room reflects its inhabitant, this website serves as a glimpse into my learning journey and a creative representation of me.</p>
    </div>
  `);

  const carousel = document.querySelector('#info-popup .carousel');
  if (!carousel) return;
  let idx = 0;
  const slides = Array.from(carousel.querySelectorAll('img'));
  const prev = carousel.querySelector('.prev');
  const next = carousel.querySelector('.next');

  // initialize slides
  slides.forEach((img, i) => {
    img.style.display = (i === 0 ? 'block' : 'none');
  });

  function showSlide(newIdx) {
    slides[idx].style.display = 'none';
    idx = (newIdx + slides.length) % slides.length;
    slides[idx].style.display = 'block';
  }

  prev.onclick = () => showSlide(idx - 1);
  next.onclick = () => showSlide(idx + 1);
}

// generic info‑popup builder
function showInfoPopup(_id, title, htmlContent) {
  console.log("im trying to open a new popup");
  let popup = document.getElementById('info-popup');

  if (!popup) {
    // first time: create the container with placeholders
    popup = document.createElement("div");
    popup.id = "info-popup";
    popup.className = "info-popup";
    popup.innerHTML = `
      <button class="close-button">×</button>
      <h2 class="info-title"></h2>
      <div class="info-content"></div>
    `;
    document.body.appendChild(popup);

    // wire up close‑button
    popup.querySelector(".close-button").onclick = () =>
      popup.classList.remove("visible");
  }

  // update title + content every time
  popup.querySelector(".info-title").textContent = title;
  popup.querySelector(".info-content").innerHTML = htmlContent;

  // show it
  popup.classList.add("visible");
}






