// Interactive 3D Particle System with Three.js
// A cutting-edge WebGL visualization

class ParticleSystem {
    constructor() {
        // Configuration
        this.config = {
            particleCount: 5000,
            particleSize: 3,
            speed: 5,
            colorMode: 'rainbow',
            fpsUpdateInterval: 500, // ms
        };

        // Setup
        this.setupScene();
        this.setupParticles();
        this.setupControls();
        this.setupEventListeners();
        this.setupPerformanceMonitoring();

        // Start animation loop
        this.animate();
    }

    setupScene() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.z = 100;

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('particleCanvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Add orbit controls for camera
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;

        // Add subtle ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Mouse position for interaction
        this.mouse = new THREE.Vector2(0, 0);
        this.mouseTarget = new THREE.Vector3(0, 0, 0);
        this.mouseInfluenceRadius = 30;
        this.mouseInfluenceStrength = 0.5;
    }

    setupParticles() {
        // Create geometry for particles
        this.particleGeometry = new THREE.BufferGeometry();
        
        // Arrays to store particle positions, colors, and velocities
        this.positions = new Float32Array(this.config.particleCount * 3);
        this.colors = new Float32Array(this.config.particleCount * 3);
        this.velocities = new Float32Array(this.config.particleCount * 3);
        this.initialPositions = new Float32Array(this.config.particleCount * 3);
        
        // Initialize particles with random positions and colors
        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in a sphere
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;
            
            // Store initial positions for reset behavior
            this.initialPositions[i3] = x;
            this.initialPositions[i3 + 1] = y;
            this.initialPositions[i3 + 2] = z;
            
            // Random velocity
            this.velocities[i3] = (Math.random() - 0.5) * 0.2;
            this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
            this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
            
            // Default rainbow colors
            this.updateParticleColor(i);
        }
        
        // Add attributes to geometry
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        // Create material for particles
        this.particleMaterial = new THREE.PointsMaterial({
            size: this.config.particleSize,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        
        // Create the particle system
        this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particles);
    }

    updateParticleColor(index) {
        const i3 = index * 3;
        
        switch (this.config.colorMode) {
            case 'rainbow':
                // HSL to RGB conversion for rainbow effect
                const h = (index % 360) / 360;
                const s = 0.7;
                const l = 0.5;
                
                // HSL to RGB conversion
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                
                this.colors[i3] = hue2rgb(p, q, h + 1/3);
                this.colors[i3 + 1] = hue2rgb(p, q, h);
                this.colors[i3 + 2] = hue2rgb(p, q, h - 1/3);
                break;
                
            case 'monochrome':
                // Blue monochrome with slight variations
                const value = 0.5 + Math.random() * 0.5;
                this.colors[i3] = 0.1 * value;
                this.colors[i3 + 1] = 0.5 * value;
                this.colors[i3 + 2] = value;
                break;
                
            case 'heat':
                // Heat map based on distance from center
                const pos = new THREE.Vector3(
                    this.positions[i3],
                    this.positions[i3 + 1],
                    this.positions[i3 + 2]
                );
                const distance = pos.length();
                const maxDist = 100;
                const normalized = Math.min(distance / maxDist, 1);
                
                // Heat map: blue to cyan to green to yellow to red
                if (normalized < 0.25) {
                    // Blue to cyan
                    this.colors[i3] = 0;
                    this.colors[i3 + 1] = normalized * 4;
                    this.colors[i3 + 2] = 1;
                } else if (normalized < 0.5) {
                    // Cyan to green
                    this.colors[i3] = 0;
                    this.colors[i3 + 1] = 1;
                    this.colors[i3 + 2] = 1 - (normalized - 0.25) * 4;
                } else if (normalized < 0.75) {
                    // Green to yellow
                    this.colors[i3] = (normalized - 0.5) * 4;
                    this.colors[i3 + 1] = 1;
                    this.colors[i3 + 2] = 0;
                } else {
                    // Yellow to red
                    this.colors[i3] = 1;
                    this.colors[i3 + 1] = 1 - (normalized - 0.75) * 4;
                    this.colors[i3 + 2] = 0;
                }
                break;
        }
    }

    updateAllColors() {
        for (let i = 0; i < this.config.particleCount; i++) {
            this.updateParticleColor(i);
        }
        this.particleGeometry.attributes.color.needsUpdate = true;
    }

    setupControls() {
        // Get DOM elements
        this.particleCountSlider = document.getElementById('particleCount');
        this.particleCountValue = document.getElementById('particleCountValue');
        this.particleSizeSlider = document.getElementById('particleSize');
        this.particleSizeValue = document.getElementById('particleSizeValue');
        this.particleSpeedSlider = document.getElementById('particleSpeed');
        this.particleSpeedValue = document.getElementById('particleSpeedValue');
        this.colorModeSelect = document.getElementById('colorMode');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.activeParticles = document.getElementById('activeParticles');
        
        // Set initial values
        this.particleCountSlider.value = this.config.particleCount;
        this.particleCountValue.textContent = this.config.particleCount;
        this.particleSizeSlider.value = this.config.particleSize;
        this.particleSizeValue.textContent = this.config.particleSize;
        this.particleSpeedSlider.value = this.config.speed;
        this.particleSpeedValue.textContent = this.config.speed;
        this.colorModeSelect.value = this.config.colorMode;
        this.activeParticles.textContent = this.config.particleCount;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Mouse movement
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        
        // Control panel interactions
        this.particleCountSlider.addEventListener('input', () => {
            const newCount = parseInt(this.particleCountSlider.value);
            this.particleCountValue.textContent = newCount;
            this.config.particleCount = newCount;
            this.regenerateParticles();
        });
        
        this.particleSizeSlider.addEventListener('input', () => {
            const newSize = parseInt(this.particleSizeSlider.value);
            this.particleSizeValue.textContent = newSize;
            this.config.particleSize = newSize;
            this.particleMaterial.size = newSize;
        });
        
        this.particleSpeedSlider.addEventListener('input', () => {
            const newSpeed = parseInt(this.particleSpeedSlider.value);
            this.particleSpeedValue.textContent = newSpeed;
            this.config.speed = newSpeed;
        });
        
        this.colorModeSelect.addEventListener('change', () => {
            this.config.colorMode = this.colorModeSelect.value;
            this.updateAllColors();
        });
    }

    regenerateParticles() {
        // Remove existing particles
        this.scene.remove(this.particles);
        
        // Create new arrays with updated particle count
        this.positions = new Float32Array(this.config.particleCount * 3);
        this.colors = new Float32Array(this.config.particleCount * 3);
        this.velocities = new Float32Array(this.config.particleCount * 3);
        this.initialPositions = new Float32Array(this.config.particleCount * 3);
        
        // Initialize new particles
        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            
            // Random position in a sphere
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            this.positions[i3] = x;
            this.positions[i3 + 1] = y;
            this.positions[i3 + 2] = z;
            
            this.initialPositions[i3] = x;
            this.initialPositions[i3 + 1] = y;
            this.initialPositions[i3 + 2] = z;
            
            // Random velocity
            this.velocities[i3] = (Math.random() - 0.5) * 0.2;
            this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
            this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
            
            // Set color based on mode
            this.updateParticleColor(i);
        }
        
        // Create new geometry with updated positions and colors
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        // Create new particle system
        this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particles);
        
        // Update UI
        this.activeParticles.textContent = this.config.particleCount;
    }

    setupPerformanceMonitoring() {
        this.fpsArray = [];
        this.lastFpsUpdate = 0;
    }

    updateFpsCounter(deltaTime) {
        // Calculate FPS (1 / deltaTime in seconds)
        const fps = 1 / (deltaTime / 1000);
        this.fpsArray.push(fps);
        
        // Update FPS counter every interval
        const now = performance.now();
        if (now - this.lastFpsUpdate > this.config.fpsUpdateInterval) {
            // Calculate average FPS
            const avgFps = Math.round(
                this.fpsArray.reduce((sum, value) => sum + value, 0) / this.fpsArray.length
            );
            
            // Update display
            this.fpsCounter.textContent = avgFps;
            
            // Reset
            this.fpsArray = [];
            this.lastFpsUpdate = now;
        }
    }

    onWindowResize() {
        // Update camera and renderer on window resize
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        // Update mouse position for interaction
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Convert mouse position to 3D coordinates
        this.mouseTarget.set(this.mouse.x * 50, this.mouse.y * 50, 0);
    }

    updateParticles(deltaTime) {
        // Calculate time factor for smooth animation regardless of frame rate
        const speedFactor = (deltaTime / 16) * (this.config.speed / 5);
        
        // Update each particle position
        for (let i = 0; i < this.config.particleCount; i++) {
            const i3 = i * 3;
            
            // Get current position
            const x = this.positions[i3];
            const y = this.positions[i3 + 1];
            const z = this.positions[i3 + 2];
            
            // Create return to origin force (soft constraint)
            const toOriginX = (this.initialPositions[i3] - x) * 0.001 * speedFactor;
            const toOriginY = (this.initialPositions[i3 + 1] - y) * 0.001 * speedFactor;
            const toOriginZ = (this.initialPositions[i3 + 2] - z) * 0.001 * speedFactor;
            
            // Mouse influence
            let mouseForceX = 0;
            let mouseForceY = 0;
            let mouseForceZ = 0;
            
            // Calculate distance to mouse position
            const dx = x - this.mouseTarget.x;
            const dy = y - this.mouseTarget.y;
            const dz = z - this.mouseTarget.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Apply mouse influence if within radius
            if (distance < this.mouseInfluenceRadius) {
                const force = (1 - distance / this.mouseInfluenceRadius) * this.mouseInfluenceStrength;
                mouseForceX = dx * force * speedFactor;
                mouseForceY = dy * force * speedFactor;
                mouseForceZ = dz * force * speedFactor;
            }
            
            // Update velocities with forces
            this.velocities[i3] += toOriginX + mouseForceX;
            this.velocities[i3 + 1] += toOriginY + mouseForceY;
            this.velocities[i3 + 2] += toOriginZ + mouseForceZ;
            
            // Apply damping
            this.velocities[i3] *= 0.98;
            this.velocities[i3 + 1] *= 0.98;
            this.velocities[i3 + 2] *= 0.98;
            
            // Update positions
            this.positions[i3] += this.velocities[i3] * speedFactor;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * speedFactor;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * speedFactor;
        }
        
        // Update geometry
        this.particleGeometry.attributes.position.needsUpdate = true;
    }

    animate() {
        const now = performance.now();
        const deltaTime = now - (this.lastFrameTime || now);
        this.lastFrameTime = now;
        
        // Request next frame
        requestAnimationFrame(() => this.animate());
        
        // Update orbit controls
        this.controls.update();
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update performance metrics
        this.updateFpsCounter(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when page is loaded
window.addEventListener('load', () => {
    new ParticleSystem();
});