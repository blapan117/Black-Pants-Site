document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       CUSTOM CURSOR
       ========================================================================== */
    const cursor = document.getElementById('custom-cursor');
    const cursorDot = document.getElementById('custom-cursor-dot');
    
    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;
    
    // Smooth custom cursor positioning (Lerp)
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Immediate position for the dot
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
    });
    
    function animateCursor() {
        // Linear interpolation to make cursor follow mouse smoothly
        const ease = 0.15;
        cursorX += (mouseX - cursorX) * ease;
        cursorY += (mouseY - cursorY) * ease;
        
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    // Hover effects for cursor
    const hoverElements = document.querySelectorAll('a, button, .vision-card, .project-card, .form-group input, .form-group textarea');
    hoverElements.forEach(elem => {
        elem.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        elem.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });

    /* ==========================================================================
       HEADER SCROLL & ACTIVE LINK NAVIGATION
       ========================================================================== */
    const header = document.querySelector('.header');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        // Sticky header styling on scroll
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Active link tracking
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });

    /* ==========================================================================
       MOBILE MENU TOGGLE
       ========================================================================== */
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });
    
    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('open');
            navMenu.classList.remove('open');
        });
    });

    /* ==========================================================================
       SCROLL REVEAL (Intersection Observer)
       ========================================================================== */
    const revealSections = document.querySelectorAll('.reveal-section');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target); // Reveal only once
            }
        });
    }, {
        threshold: 0.15 // Section is revealed when 15% visible
    });
    
    revealSections.forEach(section => {
        revealObserver.observe(section);
    });

    /* ==========================================================================
       CONTACT FORM SUBMIT ANIMATION
       ========================================================================== */
    const contactForm = document.getElementById('contact-form');
    const formFeedback = document.getElementById('form-feedback');
    const submitBtn = document.getElementById('submit-btn');
    const resetFormBtn = document.getElementById('reset-form-btn');
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Disable button & show spinner state
        submitBtn.disabled = true;
        const origContent = submitBtn.innerHTML;
        submitBtn.innerHTML = `
            <span>Invio in corso...</span>
            <svg class="btn-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-dasharray="40 10"></circle>
            </svg>
        `;
        
        // Simulate API send request
        setTimeout(() => {
            // Hide form and show feedback
            contactForm.style.opacity = '0';
            setTimeout(() => {
                contactForm.classList.add('hidden');
                formFeedback.classList.remove('hidden');
                
                // Reset submit button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
            }, 300);
        }, 1500);
    });
    
    resetFormBtn.addEventListener('click', () => {
        // Reset form input values
        contactForm.reset();
        
        // Transition back to the form
        formFeedback.classList.add('hidden');
        contactForm.classList.remove('hidden');
        setTimeout(() => {
            contactForm.style.opacity = '1';
        }, 50);
    });

    /* ==========================================================================
       INTERACTIVE CANVAS ANIMATION (HERO)
       ========================================================================== */
    const canvas = document.getElementById('canvas-animation');
    if (canvas) {
        const ctx = canvas.getContext('2d');
    
    let particlesArray = [];
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Mouse properties for particle interaction
    const mouse = {
        x: null,
        y: null,
        radius: 110 // Tight interactive radius for high-res zoom-out feel
    };
    
    // Track mouse coordinates over the window (to keep canvas interactive behind other divs)
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });
    
    // Particle Class
    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
            this.baseSize = size;
        }
        
        // Draw individual particle
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        // Update particle positions and apply interactivity
        update() {
            // Check boundary collisions and reverse velocity
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }
            
            // Mouse Interaction: Attraction/Repulsion
            if (mouse.x !== null && mouse.y !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius) {
                    // Push particles away from mouse
                    const force = (mouse.radius - distance) / mouse.radius;
                    const forceX = (dx / distance) * force * 2;
                    const forceY = (dy / distance) * force * 2;
                    
                    this.x -= forceX;
                    this.y -= forceY;
                    
                    // Grow particle size slightly near mouse
                    if (this.size < this.baseSize * 1.8) {
                        this.size += 0.15;
                    }
                } else {
                    // Shrink back to base size
                    if (this.size > this.baseSize) {
                        this.size -= 0.15;
                    }
                }
            } else {
                if (this.size > this.baseSize) {
                    this.size -= 0.15;
                }
            }
            
            // Move particle
            this.x += this.directionX;
            this.y += this.directionY;
            
            this.draw();
        }
    }
    
    // Initialize particles array
    function init() {
        particlesArray = [];
        
        // Adaptive particle count based on screen size
        let numberOfParticles = (canvas.width * canvas.height) / 8500;
        numberOfParticles = Math.min(numberOfParticles, 220); // Cap particles at 220 for density
        if (canvasWidth < 768) {
            numberOfParticles = 50; // Mobile performance optimization
        }
        
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 0.6) + 0.2; // Tiny dust-like particles for deep zoom-out effect
            let x = (Math.random() * ((canvasWidth - size * 2) - size * 2)) + size * 2;
            let y = (Math.random() * ((canvasHeight - size * 2) - size * 2)) + size * 2;
            
            // Random slow velocity
            let directionX = (Math.random() * 0.4) - 0.2;
            let directionY = (Math.random() * 0.4) - 0.2;
            
            // Color variations: violet, cyan, and translucent white
            let colorVal = Math.random();
            let color = 'rgba(255, 255, 255, 0.15)';
            if (colorVal < 0.3) {
                color = 'rgba(168, 85, 247, 0.4)'; // Neon violet
            } else if (colorVal < 0.6) {
                color = 'rgba(6, 182, 212, 0.4)';  // Neon cyan
            }
            
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }
    
    // Draw lines connecting particles
    function connect() {
        let maxDistance = 210;
        if (canvasWidth < 768) {
            maxDistance = 135;
        }
        
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    // Opacity fades as distance increases
                    let opacity = (1 - (distance / maxDistance)) * 0.15;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
            
            // Draw interactive line to the mouse cursor if close
            if (mouse.x !== null && mouse.y !== null) {
                let dx = particlesArray[a].x - mouse.x;
                let dy = particlesArray[a].y - mouse.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius) {
                    let opacity = (1 - (distance / mouse.radius)) * 0.25;
                    // Mouse connecting lines have gradient colors (violet/cyan)
                    ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
        requestAnimationFrame(animate);
    }
    
    // Window Resize Handler
    window.addEventListener('resize', () => {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Reinitialize particles to fit the new screen size bounds
        init();
    });
    
        // Run animation
        init();
        animate();
    }
});

// Inline custom CSS spinner rules injection for form loading
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);
