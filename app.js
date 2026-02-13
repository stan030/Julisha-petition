// Configuration
const API_URL = 'https://julisha-api-0wxd.onrender.com'; // Change to your deployed API URL
const PUBLIC_SALT = 'JULISHA_KENYA_2026_PUBLIC_SALT';

// State Management
let currentTab = 'id';
let phoneVerified = false;
let sentCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadVoteCount();
    setupFormHandlers();
    startCounterAnimation();
});

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update form visibility
    document.querySelectorAll('.form-content').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tab}Form`).classList.add('active');
    
    // Clear any alerts
    clearAlerts();
}

// Character Counter
function updateCharCounter(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    counter.textContent = textarea.value.length;
}

// Load Current Vote Count
async function loadVoteCount() {
    try {
        const response = await fetch(`${API_URL}/votes/count`);
        const data = await response.json();
        
        if (data.success) {
            updateCounter(data.count);
        }
    } catch (error) {
        console.error('Error loading vote count:', error);
        // Use localStorage as fallback
        const localCount = localStorage.getItem('voteCount') || 0;
        updateCounter(parseInt(localCount));
    }
}

// Update Counter Display
function updateCounter(count) {
    const counterElement = document.getElementById('voteCounter');
    const progressBar = document.getElementById('progressBar');
    const target = 1000000;
    
    // Animate counter
    animateValue(counterElement, 0, count, 2000);
    
    // Update progress bar
    const percentage = (count / target) * 100;
    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    
    // Store in localStorage
    localStorage.setItem('voteCount', count);
    
    // Update CTA counter
    updateCTACounter(count);
}

// Animate Number
function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Counter Animation on Load
function startCounterAnimation() {
    const counterSection = document.querySelector('.counter-section');
    
    setInterval(() => {
        counterSection.style.transform = 'scale(1.02)';
        setTimeout(() => {
            counterSection.style.transform = 'scale(1)';
        }, 200);
    }, 5000);
}

// Client-Side Hashing (Privacy Protection)
function hashIdentifier(identifier) {
    // Remove spaces and convert to uppercase for consistency
    const normalized = identifier.replace(/\s/g, '').toUpperCase();
    
    // Generate hash with public salt
    const hash = CryptoJS.SHA256(normalized + PUBLIC_SALT).toString();
    
    return hash;
}

// Show Alert
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

// Clear Alerts
function clearAlerts() {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = '';
}

// Setup Form Handlers
function setupFormHandlers() {
    // ID Form Handler
    document.getElementById('idForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleIdSubmission();
    });
    
    // Phone Form Handler
    document.getElementById('phoneForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!phoneVerified) {
            await handlePhoneVerification();
        } else {
            await handlePhoneSubmission();
        }
    });
}

// Handle ID Form Submission
async function handleIdSubmission() {
    const idNumber = document.getElementById('idNumber').value.trim();
    const county = document.getElementById('idCounty').value;
    const comment = document.getElementById('idComment').value.trim();
    const consent = document.getElementById('idConsent').checked;
    const submitBtn = document.getElementById('idSubmitBtn');
    
    // Validation
    if (!idNumber || !county || !consent) {
        showAlert('Please fill in all required fields and accept the terms.', 'error');
        return;
    }
    
    if (idNumber.length < 6) {
        showAlert('Please enter a valid ID or Passport number.', 'error');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...<span class="spinner"></span>';
    
    try {
        // Hash the ID client-side
        const hashedId = hashIdentifier(idNumber);
        
        // Submit to server
        const response = await fetch(`${API_URL}/votes/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'id',
                identifier: hashedId,
                county: county,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success screen
            showSuccessScreen(data.totalVotes);
        } else {
            showAlert(data.message || 'An error occurred. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register My Vote';
        }
    } catch (error) {
        console.error('Submission error:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register My Vote';
    }
}

// Handle Phone Verification
async function handlePhoneVerification() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const submitBtn = document.getElementById('phoneSubmitBtn');
    
    // Validation
    if (!phoneNumber) {
        showAlert('Please enter your phone number.', 'error');
        return;
    }
    
    // Normalize phone number
    let normalizedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
        normalizedPhone = '+254' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+')) {
        normalizedPhone = '+254' + phoneNumber;
    }
    
    // Validate format
    const phoneRegex = /^\+254[17]\d{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
        showAlert('Please enter a valid Kenyan phone number (Safaricom or Airtel).', 'error');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending Code...<span class="spinner"></span>';
    
    try {
        // Request verification code
        const response = await fetch(`${API_URL}/votes/verify-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: normalizedPhone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show code input field
            document.getElementById('codeGroup').style.display = 'block';
            phoneVerified = false;
            sentCode = data.code; // In production, this would be sent via SMS
            
            showAlert(`Verification code sent to ${normalizedPhone}. Check your SMS.`, 'success');
            
            submitBtn.textContent = 'Verify Code & Submit';
            submitBtn.disabled = false;
            
            // For demo purposes, show the code (remove in production)
            console.log('Verification code:', data.code);
            showAlert(`Demo Mode: Your code is ${data.code}`, 'info');
        } else {
            showAlert(data.message || 'Failed to send verification code.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Verification Code';
        }
    } catch (error) {
        console.error('Verification error:', error);
        showAlert('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Verification Code';
    }
}

// Handle Phone Form Submission (After Verification)
async function handlePhoneSubmission() {
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const code = document.getElementById('verificationCode').value.trim();
    const county = document.getElementById('phoneCounty').value;
    const comment = document.getElementById('phoneComment').value.trim();
    const consent = document.getElementById('phoneConsent').checked;
    const submitBtn = document.getElementById('phoneSubmitBtn');
    
    // Validation
    if (!code || code.length !== 4) {
        showAlert('Please enter the 4-digit verification code.', 'error');
        return;
    }
    
    if (!county || !consent) {
        showAlert('Please fill in all required fields and accept the terms.', 'error');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Verifying...<span class="spinner"></span>';
    
    try {
        // Normalize phone number
        let normalizedPhone = phoneNumber;
        if (phoneNumber.startsWith('0')) {
            normalizedPhone = '+254' + phoneNumber.substring(1);
        } else if (!phoneNumber.startsWith('+')) {
            normalizedPhone = '+254' + phoneNumber;
        }
        
        // Hash the phone number
        const hashedPhone = hashIdentifier(normalizedPhone);
        
        // Submit to server
        const response = await fetch(`${API_URL}/votes/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'phone',
                identifier: hashedPhone,
                verificationCode: code,
                county: county,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success screen
            showSuccessScreen(data.totalVotes);
        } else {
            showAlert(data.message || 'Verification failed. Please check your code.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Verify Code & Submit';
        }
    } catch (error) {
        console.error('Submission error:', error);
        showAlert('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Code & Submit';
    }
}

// Show Success Screen
function showSuccessScreen(totalVotes) {
    // Hide form
    document.getElementById('formContainer').style.display = 'none';
    
    // Show success screen
    const successScreen = document.getElementById('successScreen');
    successScreen.classList.add('active');
    
    // Update counter
    document.getElementById('successCount').textContent = totalVotes.toLocaleString();
    updateCounter(totalVotes);
    
    // Setup WhatsApp share
    const shareBtn = document.getElementById('shareBtn');
    const shareMessage = encodeURIComponent(
        `🔥 ENOUGH IS ENOUGH! I just signed JULISHA Petition #${totalVotes.toLocaleString()}\n\n` +
        `Demanding:\n` +
        `✅ Repeal 2026 regressive taxes\n` +
        `✅ Audit public debt NOW\n` +
        `✅ Real jobs for youth\n` +
        `✅ End corruption & wasteful spending\n\n` +
        `Join 1 MILLION Kenyans → https://julisha-petition.vercel.app\n\n` +
        `#Julisha1M #Reject2026Taxes #EnoughIsEnough #YouthUnemployedKE #RutoMustAccount`
    );
    shareBtn.href = `https://wa.me/?text=${shareMessage}`;
    
    // Confetti effect (optional)
    triggerConfetti();
}

// Confetti Effect (Simple)
function triggerConfetti() {
    // Create confetti particles
    for (let i = 0; i < 50; i++) {
        createConfettiPiece();
    }
}

function createConfettiPiece() {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = ['#BB0000', '#006B3F', '#FDB913'][Math.floor(Math.random() * 3)];
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-20px';
    confetti.style.opacity = '1';
    confetti.style.transition = 'all 3s ease-out';
    confetti.style.zIndex = '9999';
    confetti.style.borderRadius = '50%';
    
    document.body.appendChild(confetti);
    
    // Animate
    setTimeout(() => {
        confetti.style.top = window.innerHeight + 'px';
        confetti.style.opacity = '0';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
        confetti.remove();
    }, 3000);
}

// Real-time Counter Updates (WebSocket - Optional)
function setupRealtimeUpdates() {
    // This would connect to a WebSocket server for real-time updates
    // For now, we'll poll every 10 seconds
    setInterval(() => {
        loadVoteCount();
    }, 10000);
}

// Start real-time updates
setupRealtimeUpdates();

// ========== NEW FEATURES ADDED ==========

// Update CTA counter dynamically
function updateCTACounter(count) {
    const ctaCount = document.getElementById('ctaCount');
    if (ctaCount) {
        ctaCount.textContent = count.toLocaleString();
    }
}

// Load Memorial Ticker
async function loadMemorialTicker() {
    try {
        const victims = [
            { name: "Rex Kanyike Masai", age: 29, date: "June 20, 2024" },
            { name: "Evans Kiratu", age: 23, date: "June 25, 2024" },
            { name: "Ian Njoroge", status: "Abducted", date: "June 2024" },
            { name: "Billy Mwangi", status: "Abducted", date: "December 2024" },
            { name: "Peter Muteti", status: "Abducted", date: "December 2024" },
            { name: "Bernard Kavuli", status: "Abducted", date: "December 2024" }
        ];
        
        const totalKilled = 61;
        const totalAbducted = 82;
        
        const tickerText = document.querySelector('.ticker-text');
        if (!tickerText) return;
        
        let content = '';
        
        for (let i = 0; i < 3; i++) {
            victims.forEach(victim => {
                if (victim.status === 'Abducted') {
                    content += `<span><span class="victim-name">${victim.name}</span> - <span class="victim-status">ABDUCTED</span> (${victim.date})</span>`;
                } else {
                    content += `<span><span class="victim-name">${victim.name}</span> (${victim.age}) - Killed ${victim.date}</span>`;
                }
            });
            
            content += `<span style="color: var(--kenya-red); font-weight: 700;">• ${totalKilled} KILLED • ${totalAbducted} ABDUCTED SINCE JUNE 2022 •</span>`;
        }
        
        tickerText.innerHTML = content;
    } catch (error) {
        console.error('Error loading memorial ticker:', error);
    }
}

// Live Activity Ticker
function startLiveActivityTicker() {
    const liveTicker = document.getElementById('liveTicker');
    if (!liveTicker) return;
    
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Nyeri', 'Meru'];
    let counter = Math.floor(Math.random() * 10000) + 1000;
    
    function addActivity() {
        const county = counties[Math.floor(Math.random() * counties.length)];
        counter++;
        
        const activity = document.createElement('span');
        activity.textContent = `${county} • Just signed (#${counter.toLocaleString()})  •  `;
        activity.style.marginRight = '30px';
        
        liveTicker.appendChild(activity);
        
        if (liveTicker.children.length > 20) {
            liveTicker.removeChild(liveTicker.firstChild);
        }
    }
    
    addActivity();
    setInterval(addActivity, 3000);
}

// Enhanced ID Validation
function validateKenyanID(idNumber) {
    const cleaned = idNumber.replace(/\s/g, '').toUpperCase();
    
    const oldFormat = /^\d{8}$/;
    const newFormat = /^\d{7,8}[A-Z]?$/;
    const passportFormat = /^[A-Z]{1,2}\d{6,7}$/;
    
    if (oldFormat.test(cleaned) || newFormat.test(cleaned) || passportFormat.test(cleaned)) {
        return { valid: true, message: 'Valid format' };
    }
    
    return { 
        valid: false, 
        message: '❌ Invalid ID/Passport format. Please check and try again.' 
    };
}

// Initialize all new features on page load
document.addEventListener('DOMContentLoaded', () => {
    loadVoteCount();
    setupFormHandlers();
    startCounterAnimation();
    loadMemorialTicker();
    startLiveActivityTicker();
    
    // Update counter to also update CTA
    const originalLoadVoteCount = loadVoteCount;
    loadVoteCount = function() {
        originalLoadVoteCount();
    };
});

// Wrap original handleIdSubmission with validation
const _originalHandleIdSubmission = handleIdSubmission;
handleIdSubmission = async function() {
    const idNumber = document.getElementById('idNumber').value.trim();
    
    const validation = validateKenyanID(idNumber);
    if (!validation.valid) {
        showAlert(validation.message, 'error');
        return;
    }
    
    return _originalHandleIdSubmission.call(this);
};
