
// ══════════════════════════════════════════════════════════════════
//  THEME-ADAPTIVE 3D PARTICLE BACKGROUND (Three.js - High Performance)
// ══════════════════════════════════════════════════════════════════

(function init3DBackground() {
    const canvas = document.querySelector('#bg-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ── Crisp Antialiased Circular Glow Particle Texture ──
    function createDotTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const center = 16;
        const radius = 14;

        const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    const dotTexture = createDotTexture();

    // ── Harmonious Theme Color Palettes ──
    const DARK_PALETTE = [
        new THREE.Color('#ffffff'),
        new THREE.Color('#ffffff'),
        new THREE.Color('#ffffff'),
        new THREE.Color('#f8fafc'),
        new THREE.Color('#f1f5f9')
    ];

    const LIGHT_PALETTE = [
        new THREE.Color('#7c3aed'),
        new THREE.Color('#a78bfa'),
        new THREE.Color('#8b5cf6'),
        new THREE.Color('#c084fc'),
        new THREE.Color('#9333ea'),
        new THREE.Color('#a855f7'),
        new THREE.Color('#6d28d9'),
        new THREE.Color('#6366f1'),
        new THREE.Color('#818cf8')
    ];

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    const COUNT = 3800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const currentColors = new Float32Array(COUNT * 3);
    const startColors = new Float32Array(COUNT * 3);
    const darkColors = new Float32Array(COUNT * 3);
    const lightColors = new Float32Array(COUNT * 3);

    const isCurrentLight = document.documentElement.dataset.theme === 'light';

    for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        // Bounded depth to prevent camera lens clipping / oversized blobs
        positions[i3] = (Math.random() - 0.5) * 95;
        positions[i3 + 1] = (Math.random() - 0.5) * 95;
        positions[i3 + 2] = (Math.random() - 0.5) * 55 - 15; // Z between -42.5 and +12.5

        const darkCol = pickRandom(DARK_PALETTE);
        darkColors[i3] = darkCol.r;
        darkColors[i3 + 1] = darkCol.g;
        darkColors[i3 + 2] = darkCol.b;

        const lightCol = pickRandom(LIGHT_PALETTE);
        lightColors[i3] = lightCol.r;
        lightColors[i3 + 1] = lightCol.g;
        lightColors[i3 + 2] = lightCol.b;

        const initCol = isCurrentLight ? lightCol : darkCol;
        currentColors[i3] = initCol.r;
        currentColors[i3 + 1] = initCol.g;
        currentColors[i3 + 2] = initCol.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        map: dotTexture,
        vertexColors: true,
        transparent: true,
        opacity: isCurrentLight ? 0.88 : 0.82,
        sizeAttenuation: true,
        depthWrite: false
    });

    const particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    // ── Smooth Fixed-Step Transition Engine (Zero idle CPU/GPU overhead) ──
    let isTransitioning = false;
    let transitionStep = 0;
    const TOTAL_TRANSITION_STEPS = 20; // ~330ms at 60fps
    let activeTarget = isCurrentLight ? lightColors : darkColors;

    function triggerThemeTransition(toLight) {
        activeTarget = toLight ? lightColors : darkColors;
        material.opacity = toLight ? 0.88 : 0.82;
        // Snapshot current colors
        for (let i = 0; i < COUNT * 3; i++) {
            startColors[i] = currentColors[i];
        }
        transitionStep = 0;
        isTransitioning = true;
    }

    function onThemeChange() {
        const isLight = document.documentElement.dataset.theme === 'light';
        triggerThemeTransition(isLight);
    }

    const themeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.attributeName === 'data-theme') {
                onThemeChange();
            }
        }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('themeChanged', onThemeChange);

    // ── Smooth Inertial Mouse & Scroll Physics ──
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let scrollY = window.scrollY;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        targetMouseX = (event.clientX - windowHalfX) * 0.0006;
        targetMouseY = (event.clientY - windowHalfY) * 0.0006;
    }, { passive: true });

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY;
    }, { passive: true });

    // ── High-Performance Render Loop ──
    function animate() {
        // Inertial parallax smoothing
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;

        // Continuous 3D rotation & parallax
        particlesMesh.rotation.y += 0.00015;
        particlesMesh.rotation.x += 0.00008;
        particlesMesh.rotation.y += currentMouseX * 0.02;
        particlesMesh.rotation.x += currentMouseY * 0.02;

        // Gentle scroll reaction
        const targetScrollRotZ = scrollY * 0.00008;
        particlesMesh.rotation.z += (targetScrollRotZ - particlesMesh.rotation.z) * 0.04;

        // Fixed-duration color morphing during theme toggle only
        if (isTransitioning) {
            transitionStep++;
            const progress = Math.min(transitionStep / TOTAL_TRANSITION_STEPS, 1);
            const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            for (let i = 0; i < COUNT * 3; i++) {
                currentColors[i] = startColors[i] + (activeTarget[i] - startColors[i]) * ease;
            }
            geometry.attributes.color.needsUpdate = true;

            if (progress >= 1) {
                isTransitioning = false;
            }
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();


gsap.registerPlugin(ScrollTrigger);


const hero = document.querySelector('.hero');
if (hero) {
    const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 1 } });

    tl.fromTo(".sub-title",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0 }
    )
        .fromTo(".year",
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0 },
            "-=0.5"
        )
        .fromTo(".main-title",
            { opacity: 0, scale: 0.9, y: 20 },
            { opacity: 1, scale: 1, y: 0 },
            "-=0.5"
        )
        .fromTo(".hero-buttons .btn-resume:first-child",
            { opacity: 0, x: -50 },
            { opacity: 1, x: 0 },
            "-=0.5"
        )
        .fromTo(".hero-buttons .btn-resume:last-child",
            { opacity: 0, x: 50 },
            { opacity: 1, x: 0 },
            "<"
        );
}


document.querySelectorAll('.section-title').forEach(title => {
    gsap.fromTo(title,
        { opacity: 0, y: 40 },
        {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
                trigger: title,
                start: "top 88%",
                toggleActions: "play none none reverse"
            }
        }
    );
});


const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((item) => {
    const isLeft = item.classList.contains('left');
    gsap.fromTo(item,
        { opacity: 0, x: isLeft ? -80 : 80 },
        {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: item,
                start: "top 85%",
                toggleActions: "play none none reverse"
            }
        }
    );
});


const projectCards = document.querySelectorAll('.experience-card');
if (projectCards.length) {
    gsap.fromTo(projectCards,
        { opacity: 0, y: 60, scale: 0.95 },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: "back.out(1.4)",
            stagger: 0.12,
            scrollTrigger: {
                trigger: '.experience-grid',
                start: "top 80%",
                toggleActions: "play none none reverse"
            }
        }
    );
}


const skillCards = document.querySelectorAll('.skill-grid .skill-card');
if (skillCards.length) {
    gsap.fromTo(skillCards,
        { opacity: 0, y: 40, scale: 0.9 },
        {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            stagger: {
                each: 0.05,
                from: "start"
            },
            scrollTrigger: {
                trigger: '.skill-grid',
                start: "top 82%",
                toggleActions: "play none none reverse"
            }
        }
    );
}


const contactContainer = document.querySelector('.contact-container');
if (contactContainer) {
    gsap.fromTo(contactContainer,
        { opacity: 0, scale: 0.92, filter: "blur(8px)" },
        {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
                trigger: contactContainer,
                start: "top 80%",
                toggleActions: "play none none reverse"
            }
        }
    );
}


const certItems = document.querySelectorAll('.cert-item');
if (certItems.length) {
    gsap.fromTo(certItems,
        { opacity: 0, scale: 0.92, filter: "blur(8px)" },
        {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            stagger: 0.15,
            scrollTrigger: {
                trigger: '.cert-grid',
                start: "top 80%",
                toggleActions: "play none none reverse"
            }
        }
    );
}
