// Video Speed Controller for TabTamer
console.log("🎬 TabTamer Video Controller loaded");

// Store active video elements and their speed controls
const videoState = {
    videos: new Map(), // video element -> controller UI
    speeds: new Map(), // video element -> current speed
    defaultSpeed: 1.0,
    enabled: true
};

// Speed presets
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];

// Load preferences
chrome.storage.local.get(['videoSpeedPrefs', 'preferences'], (data) => {
    videoState.enabled = data.preferences?.videoControlEnabled ?? true;

    // Load per-domain speed preferences
    if (data.videoSpeedPrefs) {
        const domain = window.location.hostname.replace(/^www\./, '');
        videoState.defaultSpeed = data.videoSpeedPrefs[domain] || 1.0;
    }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "TOGGLE_VIDEO_CONTROL") {
        videoState.enabled = msg.enabled;
        if (!videoState.enabled) {
            // Remove all controllers
            videoState.videos.forEach((controller, video) => {
                if (controller && controller.parentNode) {
                    controller.remove();
                }
            });
            videoState.videos.clear();
        } else {
            // Re-initialize for existing videos
            document.querySelectorAll('video').forEach(initVideoController);
        }
    }
    else if (msg.action === "SET_DEFAULT_SPEED") {
        videoState.defaultSpeed = msg.speed;
        // Update all videos without custom speeds
        videoState.videos.forEach((controller, video) => {
            if (!videoState.speeds.has(video)) {
                setVideoSpeed(video, videoState.defaultSpeed);
                updateControllerSpeed(controller, videoState.defaultSpeed);
            }
        });
    }
});

// Initialize controller for a video element
function initVideoController(video) {
    if (!videoState.enabled) return;
    if (videoState.videos.has(video)) return; // Already has controller

    // Create controller element
    const controller = document.createElement('div');
    controller.className = 'tabtamer-video-controller';
    controller.innerHTML = `
        <div class="tabtamer-speed-display">${video.playbackRate.toFixed(2)}x</div>
        <div class="tabtamer-speed-controls">
            <button class="tabtamer-speed-btn" data-speed="0.5">0.5x</button>
            <button class="tabtamer-speed-btn" data-speed="1.0">1x</button>
            <button class="tabtamer-speed-btn" data-speed="1.5">1.5x</button>
            <button class="tabtamer-speed-btn" data-speed="2.0">2x</button>
            <input type="range" class="tabtamer-speed-slider" min="0.25" max="4" step="0.05" value="${video.playbackRate}">
        </div>
    `;

    // Style the controller
    Object.assign(controller.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        borderRadius: '8px',
        padding: '8px',
        zIndex: '999999',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
        transition: 'opacity 0.2s',
        opacity: '0.7'
    });

    // Style the speed display
    const display = controller.querySelector('.tabtamer-speed-display');
    Object.assign(display.style, {
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '4px',
        color: '#667eea'
    });

    // Style the controls container
    const controls = controller.querySelector('.tabtamer-speed-controls');
    Object.assign(controls.style, {
        display: 'flex',
        gap: '4px',
        alignItems: 'center'
    });

    // Style buttons
    controller.querySelectorAll('.tabtamer-speed-btn').forEach(btn => {
        Object.assign(btn.style, {
            background: '#333',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '500',
            transition: 'all 0.2s'
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#667eea';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#333';
        });
    });

    // Style slider
    const slider = controller.querySelector('.tabtamer-speed-slider');
    Object.assign(slider.style, {
        width: '80px',
        height: '4px',
        borderRadius: '2px',
        background: '#444',
        outline: 'none',
        cursor: 'pointer'
    });

    // Position controller relative to video
    const videoRect = video.getBoundingClientRect();
    if (videoRect.width > 100) {
        controller.style.top = videoRect.top + 10 + 'px';
        controller.style.right = (window.innerWidth - videoRect.right) + 10 + 'px';
    }

    // Add to DOM
    document.body.appendChild(controller);
    videoState.videos.set(video, controller);

    // Set up event listeners
    setupControllerEvents(video, controller);

    // Show on hover
    video.addEventListener('mouseenter', () => {
        controller.style.opacity = '1';
    });

    video.addEventListener('mouseleave', () => {
        controller.style.opacity = '0.7';
    });

    // Update position on scroll/resize
    const updatePosition = () => {
        const rect = video.getBoundingClientRect();
        if (rect.width > 100) {
            controller.style.top = rect.top + 10 + 'px';
            controller.style.right = (window.innerWidth - rect.right) + 10 + 'px';
        }
    };

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    // Clean up on video removal
    const observer = new MutationObserver((mutations) => {
        if (!document.body.contains(video)) {
            controller.remove();
            videoState.videos.delete(video);
            videoState.speeds.delete(video);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Set up event listeners for controller
function setupControllerEvents(video, controller) {
    // Speed preset buttons
    controller.querySelectorAll('.tabtamer-speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const speed = parseFloat(btn.dataset.speed);
            setVideoSpeed(video, speed);
            updateControllerSpeed(controller, speed);
            saveSpeedPreference(speed);
        });
    });

    // Speed slider
    const slider = controller.querySelector('.tabtamer-speed-slider');
    slider.addEventListener('input', (e) => {
        e.stopPropagation();
        const speed = parseFloat(e.target.value);
        setVideoSpeed(video, speed);
        updateControllerSpeed(controller, speed);
    });

    slider.addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        saveSpeedPreference(speed);
    });

    // Keyboard shortcuts (when video is focused)
    video.addEventListener('keydown', (e) => {
        if (!videoState.enabled) return;

        if (e.key === '>' || e.key === '.') {
            // Increase speed
            e.preventDefault();
            const currentSpeed = video.playbackRate;
            const nextSpeed = getNextSpeed(currentSpeed, 1);
            setVideoSpeed(video, nextSpeed);
            updateControllerSpeed(controller, nextSpeed);
            saveSpeedPreference(nextSpeed);
        }
        else if (e.key === '<' || e.key === ',') {
            // Decrease speed
            e.preventDefault();
            const currentSpeed = video.playbackRate;
            const nextSpeed = getNextSpeed(currentSpeed, -1);
            setVideoSpeed(video, nextSpeed);
            updateControllerSpeed(controller, nextSpeed);
            saveSpeedPreference(nextSpeed);
        }
    });
}

// Set video playback speed
function setVideoSpeed(video, speed) {
    speed = Math.max(0.25, Math.min(4, speed));
    video.playbackRate = speed;
    videoState.speeds.set(video, speed);

    // Also handle any audio elements that might be associated
    if (video.audioTracks) {
        // For some video players
    }
}

// Update controller display
function updateControllerSpeed(controller, speed) {
    const display = controller.querySelector('.tabtamer-speed-display');
    if (display) {
        display.textContent = speed.toFixed(2) + 'x';
    }

    const slider = controller.querySelector('.tabtamer-speed-slider');
    if (slider) {
        slider.value = speed;
    }
}

// Get next speed preset
function getNextSpeed(currentSpeed, direction) {
    const roundedSpeed = Math.round(currentSpeed * 20) / 20; // Round to nearest 0.05

    if (direction > 0) {
        // Find next higher preset
        for (let i = 0; i < SPEED_PRESETS.length; i++) {
            if (SPEED_PRESETS[i] > roundedSpeed + 0.01) {
                return SPEED_PRESETS[i];
            }
        }
        return 4.0; // Max speed
    } else {
        // Find next lower preset
        for (let i = SPEED_PRESETS.length - 1; i >= 0; i--) {
            if (SPEED_PRESETS[i] < roundedSpeed - 0.01) {
                return SPEED_PRESETS[i];
            }
        }
        return 0.25; // Min speed
    }
}

// Save speed preference for domain
function saveSpeedPreference(speed) {
    const domain = window.location.hostname.replace(/^www\./, '');

    chrome.storage.local.get(['videoSpeedPrefs'], ({ videoSpeedPrefs = {} }) => {
        videoSpeedPrefs[domain] = speed;
        chrome.storage.local.set({ videoSpeedPrefs });
        console.log(`Saved speed preference for ${domain}: ${speed}x`);
    });
}

// Initialize for existing and new videos
function initVideoControllers() {
    document.querySelectorAll('video').forEach(initVideoController);

    // Watch for new videos being added
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeName === 'VIDEO') {
                    initVideoController(node);
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video').forEach(initVideoController);
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoControllers);
} else {
    initVideoControllers();
}