document.addEventListener("DOMContentLoaded", () => {

    // --- State Management สำหรับ Canvas ---
    const state = {
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2
    };

    // อัปเดตตำแหน่งเมาส์เพื่อส่งค่าไปให้คลื่นน้ำ (Fluid Flow)
    document.addEventListener("mousemove", (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
    });

    // --- 7. Canvas "Fluid Flow" ---
    const canvas = document.getElementById('zen-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let time = 0;

        function resizeCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                alpha: Math.random() * 0.5 + 0.1
            });
        }

        function drawWaves() {
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 1;
            
            for(let j = 0; j < 5; j++) {
                ctx.beginPath();
                ctx.moveTo(0, height);
                
                let yOffset = height - (j * 40) - 100;
                let gradient = ctx.createLinearGradient(0, yOffset - 50, 0, height);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${0.02 + j*0.01})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                for(let i = 0; i <= width; i+=20) {
                    let wave1 = Math.sin((i * 0.003) + time + j) * 30;
                    let wave2 = Math.cos((i * 0.005) - (time*0.8) + j) * 20;
                    
                    let dx = i - state.mouseX;
                    let dy = (yOffset + wave1 + wave2) - state.mouseY;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    let repulse = 0;
                    if(dist < 200) repulse = (200 - dist) * 0.1;

                    ctx.lineTo(i, yOffset + wave1 + wave2 + repulse);
                }
                ctx.lineTo(width, height);
                ctx.lineTo(0, height);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            particles.forEach(p => {
                p.y -= p.speed;
                p.x += Math.sin(time + p.y * 0.01) * 0.5;

                if (p.y < 0) {
                    p.y = height;
                    p.x = Math.random() * width;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                ctx.fill();
            });

            time += 0.01;
            requestAnimationFrame(drawWaves);
        }
        drawWaves();
    }


    // --- Scroll Thread Logic ---
    const threadLine = document.getElementById('thread-line');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        if(threadLine) threadLine.style.height = scrollPercent + '%';
    });


    // --- Reveal Text on Scroll Logic ---
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-text').forEach(el => observer.observe(el));


    // --- Mobile Menu Logic ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    let isMenuOpen = false;

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            if (isMenuOpen) {
                mobileMenu.classList.remove('opacity-0', 'pointer-events-none');
                mobileMenuBtn.textContent = '✕';
            } else {
                mobileMenu.classList.add('opacity-0', 'pointer-events-none');
                mobileMenuBtn.textContent = '☰';
            }
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                isMenuOpen = false;
                mobileMenu.classList.add('opacity-0', 'pointer-events-none');
                mobileMenuBtn.textContent = '☰';
            });
        });
    }

    // --- View Routing Logic ---
    const homeView = document.getElementById('home-view');
    const aboutView = document.getElementById('about-view');

    function handleHashChange() {
        const hash = window.location.hash;
        if (hash === '#about-page') {
            homeView.classList.add('hidden');
            homeView.classList.remove('block');
            aboutView.classList.remove('hidden');
            aboutView.classList.add('block');
            window.scrollTo(0, 0);
        } else {
            homeView.classList.remove('hidden');
            homeView.classList.add('block');
            aboutView.classList.add('hidden');
            aboutView.classList.remove('block');
            
            if (hash && hash !== '#home') {
                const targetEl = document.querySelector(hash);
                if (targetEl) {
                    setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 50);
                }
            } else {
                window.scrollTo(0, 0);
            }
        }
    }

    window.addEventListener('hashchange', handleHashChange);
    if(window.location.hash) {
        handleHashChange();
    }
});

// --- FAQ Accordion Toggle ---
window.toggleZenAccordion = function(element) {
    const isActive = element.classList.contains('active');
    document.querySelectorAll('.zen-accordion').forEach(el => el.classList.remove('active'));
    if (!isActive) {
        element.classList.add('active');
    }
}