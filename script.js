// --- 1. State Management ---
const state = {
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    scrollProgress: 0
};

// --- 2. Custom Cursor Logic ---
const cursorDot = document.getElementById('cursor-dot');
const cursorOutline = document.getElementById('cursor-outline');
const magneticTriggers = document.querySelectorAll('.magnetic-trigger');

window.addEventListener('mousemove', (e) => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;

    cursorDot.style.left = `${state.mouseX}px`;
    cursorDot.style.top = `${state.mouseY}px`;

    setTimeout(() => {
        cursorOutline.style.left = `${state.mouseX}px`;
        cursorOutline.style.top = `${state.mouseY}px`;
    }, 50);
});

magneticTriggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', () => {
        cursorOutline.classList.add('hovered');
    });
    trigger.addEventListener('mouseleave', () => {
        cursorOutline.classList.remove('hovered');
        trigger.style.transform = `translate(0px, 0px)`;
    });
    trigger.addEventListener('mousemove', (e) => {
        const rect = trigger.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        trigger.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
});

// --- 3. Scroll Logic (Hero Parallax Sinking Effect & Thread Line) ---
const heroText = document.getElementById('hero-text');

window.addEventListener('scroll', () => {
    const totalScroll = window.scrollY; // ใช้ scrollY ในการอ้างอิงตำแหน่งปัจจุบัน
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = totalScroll / windowHeight;
    
    // เส้นด้ายดึงลงตามสัดส่วนการ Scroll
    document.getElementById('thread-line').style.height = `${scrollPercent * 100}%`;

    // Parallax ลูกเล่นจมน้ำของ Hero Section (ทำงานเฉพาะตอนเลื่อนอยู่ในหน้าแรก)
    if(heroText && totalScroll < window.innerHeight) {
        // totalScroll * 0.5 คือให้ข้อความเลื่อนลงต่ำกว่าการเลื่อนจอเล็กน้อย
        // ส่วน opacity จะคำนวณให้ค่อยๆ จางหายไปจนเหลือ 0 (จมมิด)
        heroText.style.transform = `translateY(${totalScroll * 0.5}px)`;
        heroText.style.opacity = 1 - (totalScroll / (window.innerHeight * 0.6));
    }
});

// --- 4. Intersection Observer ---
const observerOptions = { threshold: 0.15, rootMargin: "0px" };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-text').forEach(el => observer.observe(el));

// --- 5. Zen Accordion Logic (สำหรับ FAQ แบบใหม่) ---
window.toggleZenAccordion = function(element) {
    // ปิดอันอื่นที่เปิดอยู่
    document.querySelectorAll('.zen-accordion').forEach(item => {
        if (item !== element) {
            item.classList.remove('active');
            const icon = item.querySelector('.zen-accordion-icon');
            if(icon) {
                icon.textContent = '+';
                icon.classList.remove('rotate-45', 'text-gold');
            }
        }
    });

    // เปิด/ปิด อันที่ถูกคลิก
    element.classList.toggle('active');
    const icon = element.querySelector('.zen-accordion-icon');
    
    if (element.classList.contains('active')) {
        icon.textContent = '+'; // ใช้เครื่องหมายบวก แต่ CSS จะหมุน 45 องศาให้เป็นกากบาทแทน
        icon.classList.add('text-gold');
    } else {
        icon.textContent = '+';
        icon.classList.remove('text-gold');
    }
}


// --- 7. Canvas "Fluid Flow" ---
const canvas = document.getElementById('zen-canvas');
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
        gradient.addColorStop(0, `rgba(181, 166, 138, ${0.02 + j*0.01})`);
        gradient.addColorStop(1, 'rgba(11, 13, 11, 0)');
        
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
        ctx.fillStyle = `rgba(181, 166, 138, ${p.alpha})`;
        ctx.fill();
    });

    time += 0.01;
    requestAnimationFrame(drawWaves);
}
drawWaves();

// --- 8. Chart.js Radar Chart ---
const ctxChart = document.getElementById('efficiency-chart').getContext('2d');
const efficiencyChart = new Chart(ctxChart, {
    type: 'radar',
    data: {
        labels: ['Speed', 'Cost Efficiency', 'Quality', 'Risk Mitigation', 'Transparency'],
        datasets: [
            {
                label: 'Consult NAMU',
                data: [90, 85, 95, 90, 100],
                backgroundColor: 'rgba(181, 166, 138, 0.15)',
                borderColor: '#B5A68A',
                pointBackgroundColor: '#B5A68A',
                pointBorderColor: '#0B0D0B',
                pointHoverBackgroundColor: '#E8EBE8',
                pointHoverBorderColor: '#B5A68A',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'Traditional Methods',
                data: [50, 60, 55, 45, 40],
                backgroundColor: 'rgba(232, 235, 232, 0.02)',
                borderColor: '#222922',
                pointBackgroundColor: '#222922',
                pointBorderColor: '#0B0D0B',
                pointHoverBackgroundColor: '#E8EBE8',
                pointHoverBorderColor: '#222922',
                borderWidth: 1,
                borderDash: [5, 5],
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(181, 166, 138, 0.05)' },
                grid: { color: 'rgba(255, 255, 255, 0.03)', circular: true },
                pointLabels: { color: '#828A82', font: { family: 'Inter', size: 11, weight: 300, letterSpacing: 1 } },
                ticks: { display: false, min: 0, max: 100 }
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#828A82', font: { family: 'Inter', size: 11 }, padding: 20, usePointStyle: true }
            },
            tooltip: {
                backgroundColor: 'rgba(11, 13, 11, 0.9)',
                titleColor: '#B5A68A',
                bodyColor: '#E8EBE8',
                borderColor: '#222922',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: { label: function(context) { return context.raw + '% Optimization'; } }
            }
        },
        animation: { duration: 2500, easing: 'easeOutQuart' }
    }
});