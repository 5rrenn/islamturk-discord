
// Global variables
let isVpnDetected = false;
let userFingerprint = '';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Main initialization function
async function initializeApp() {
    // Show loading screen
    showLoadingScreen();
    
    // Create background particles
    createParticles();
    
    // Generate user fingerprint
    userFingerprint = await generateFingerprint();
    
    // Check for VPN/Proxy
    await checkVpnProxy();
    
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        hideLoadingScreen();
        showWelcomeScreen();
    }, 2000);
}

// Loading screen functions
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

// Welcome screen functions
function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    welcomeScreen.style.display = 'flex';
}

function showRegistration() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContainer = document.getElementById('mainContainer');
    
    welcomeScreen.classList.add('hidden');
    setTimeout(() => {
        welcomeScreen.style.display = 'none';
        mainContainer.style.display = 'flex';
    }, 800);
}

function showWelcome() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mainContainer = document.getElementById('mainContainer');
    
    mainContainer.style.display = 'none';
    welcomeScreen.style.display = 'flex';
    welcomeScreen.classList.remove('hidden');
}


function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 15 + 15) + 's';
        particlesContainer.appendChild(particle);
    }
}


document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');
    const btnIcon = document.querySelector('.btn-icon');
    
    
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    try {
        
        if (isVpnDetected) {
            document.getElementById('errorMessage').textContent = 'VPN/Proxy kullanımı tespit edildi. Lütfen VPN/Proxy\'nizi kapatıp tekrar deneyin.';
            showModal('errorModal');
            return;
        }

        
        const formData = {
            discordName: document.getElementById('discordName').value,
            email: document.getElementById('email').value,
            gender: document.querySelector('input[name="gender"]:checked').value,
            age: document.getElementById('age').value,
            desiredName: document.getElementById('desiredName').value
        };
        
        
        // Get user location and info
        const userInfo = await getUserInfo();
        
        
        const fullData = {
            // Form data
            discordName: formData.discordName,
            email: formData.email,
            gender: formData.gender,
            age: formData.age,
            desiredName: formData.desiredName,
            
            // User info
            fingerprint: userInfo.fingerprint,
            vpnDetected: userInfo.vpnDetected,
            ipAddress: userInfo.ipAddress,
            location: userInfo.location,
            platform: userInfo.platform,
            screenResolution: userInfo.screenResolution,
            colorDepth: userInfo.colorDepth,
            deviceMemory: userInfo.deviceMemory,
            hardwareConcurrency: userInfo.hardwareConcurrency,
            language: userInfo.language,
            timezone: userInfo.timezone,
            connection: userInfo.connection,
            
            // Additional data
            timestamp: new Date().toISOString(),
            serverName: 'İslamTürk',
            userAgent: navigator.userAgent
        };
        
        
        const encryptedData = await encryptData(fullData);
        
        
        const response = await fetch('/.netlify/functions/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: encryptedData })
        });
        
        if (response.ok) {
            showModal('successModal');
            document.getElementById('registrationForm').reset();
        } else {
            throw new Error('Sunucu hatası');
        }
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('errorMessage').textContent = 'Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.';
        showModal('errorModal');
    } finally {
        
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});


async function checkVpnProxy() {
    try {
        
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://ipapi.co/json/',
            'https://httpbin.org/ip'
        ];
        
        const results = await Promise.allSettled(
            ipServices.map(url => fetch(url).then(r => r.json()))
        );
        
        const ips = results
            .filter(result => result.status === 'fulfilled')
            .map(result => {
                const data = result.value;
                return data.ip || data.origin || data.query;
            })
            .filter(ip => ip);
        
        
        const uniqueIps = [...new Set(ips)];
        if (uniqueIps.length > 1) {
            isVpnDetected = true;
        }
        
        
        if (results[1].status === 'fulfilled') {
            const locationData = results[1].value;
            if (locationData.proxy || locationData.threat_types?.includes('proxy')) {
                isVpnDetected = true;
            }
        }
        
    } catch (error) {
        console.warn('VPN detection failed:', error);
    }
}


async function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = {
        canvas: canvas.toDataURL(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        memory: navigator.deviceMemory || 'unknown',
        cores: navigator.hardwareConcurrency || 'unknown',
        plugins: Array.from(navigator.plugins).map(p => p.name).join(','),
        webgl: getWebGLFingerprint()
    };
    
    
    const fingerprintString = JSON.stringify(fingerprint);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}


function getWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'not supported';
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
    } catch (e) {
        return 'error';
    }
}


async function getUserInfo() {
    const userInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        fingerprint: userFingerprint,
        vpnDetected: isVpnDetected,
        deviceMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        } : 'unknown'
    };
    
    
    try {
        const ipResponse = await fetch('https://ipapi.co/json/')
        const ipData = await ipResponse.json();
        
        userInfo.ipAddress = ipData.ip;
        userInfo.location = {
            country: ipData.country_name,
            city: ipData.city,
            region: ipData.region,
            postal: ipData.postal,
            latitude: ipData.latitude,
            longitude: ipData.longitude,
            isp: ipData.org,
            asn: ipData.asn
        };
        userInfo.vpnDetected = userInfo.vpnDetected || ipData.proxy || false;
        
    } catch (error) {
        console.error('IP fetch error:', error);
        userInfo.ipAddress = 'Alınamadı';
        userInfo.location = { 
            country: 'Bilinmiyor', 
            city: 'Bilinmiyor', 
            region: 'Bilinmiyor' 
        };
    }
    
    return userInfo;
}


async function encryptData(data) {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    
    const base64String = btoa(String.fromCharCode(...dataBuffer));
    return base64String;
}


function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('show');
        modal.style.display = 'none';
    });
}


document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});


document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
    
    input.addEventListener('input', function() {
        if (this.value) {
            this.parentElement.classList.add('has-value');
        } else {
            this.parentElement.classList.remove('has-value');
        }
    });
});


document.getElementById('discordName').addEventListener('input', function() {
    const value = this.value;
    const hint = this.parentElement.nextElementSibling;
    
    if (value.includes('#')) {
        hint.style.color = '#ff6b6b';
        hint.textContent = 'Eski Discord formatı! Yeni kullanıcı adınızı girin (# işareti olmadan)';
    } else if (value.includes(' ')) {
        hint.style.color = '#ff6b6b';
        hint.textContent = 'Discord kullanıcı adında boşluk olamaz';
    } else {
        hint.style.color = 'rgba(255, 255, 255, 0.6)';
        hint.textContent = 'Gerçek Discord kullanıcı adınızı girin (görünür ad değil)';
    }
});


document.getElementById('age').addEventListener('input', function() {
    const age = parseInt(this.value);
    if (age < 13) {
        this.setCustomValidity('Minimum yaş 13 olmalıdır');
    } else if (age > 99) {
        this.setCustomValidity('Maksimum yaş 99 olmalıdır');
    } else {
        this.setCustomValidity('');
    }
});


document.getElementById('email').addEventListener('input', function() {
    const email = this.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        this.setCustomValidity('Geçerli bir e-mail adresi girin');
    } else {
        this.setCustomValidity('');
    }
});


document.documentElement.style.scrollBehavior = 'smooth';


document.addEventListener('mousemove', function(e) {
    const shapes = document.querySelectorAll('.shape');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    shapes.forEach((shape, index) => {
        const speed = (index + 1) * 0.5;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        
        shape.style.transform = `translate(${x}px, ${y}px)`;
    });
});


window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});


document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});


const formInputs = document.querySelectorAll('#registrationForm input, #registrationForm select');
formInputs.forEach(input => {
    
    const savedValue = localStorage.getItem(`islamturk_${input.name}`);
    if (savedValue && input.type !== 'email') { 
        input.value = savedValue;
        if (input.value) {
            input.parentElement.classList.add('has-value');
        }
    }
    
    
    input.addEventListener('input', function() {
        localStorage.setItem(`islamturk_${this.name}`, this.value);
    });
});


function clearSavedData() {
    formInputs.forEach(input => {
        localStorage.removeItem(`islamturk_${input.name}`);
    });
}


// Override showModal to clear saved data on success
const originalShowModal = showModal;
showModal = function(modalId) {
    if (modalId === 'successModal') {
        clearSavedData();
    }
    originalShowModal(modalId);
};

// Add error handling for failed API calls
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show error to user for API failures, just log them
});

// Add connection status monitoring
window.addEventListener('online', function() {
    console.log('Connection restored');
});

window.addEventListener('offline', function() {
    console.log('Connection lost');
    // Could show a notification to user
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}
