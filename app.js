// Configuration Configuration: Points straight to your local live Express backend
const API_BASE_URL = 'http://localhost:5000/api';

// Operational Client States
let currentUser = {
    id: null,
    username: "Creator",
    assigned_slot_id: null,
    token: null
};
let activeFeedLinks = [];

// ========================================================
// 1. DAFEGUARD HANDSHAKE: LOAD PROFILE & SESSION STORAGE
// ========================================================
function loadSessionCredentials() {
    const storedToken = localStorage.getItem('coop_token');
    const storedUser = localStorage.getItem('coop_user');

    // Security Guard: If no session tokens exist, send them back to the login landing screen
    if (!storedToken || !storedUser) {
        window.location.href = 'landing.html';
        return false;
    }

    currentUser = JSON.parse(storedUser);
    currentUser.token = storedToken;
    return true;
}

// ========================================================
// 2. THE FISHER-YATES TRAFFIC DE-BIASING RANDOMIZER
// ========================================================
// Scrambles the incoming array of links in 0ms on the user's phone or browser.
// This ensures every single peer hits links in a completely randomized sequence.
function shuffleLinksArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // Swap array element rows atomically on the client
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// ========================================================
// 3. THE SHIFT GATEKEEPER TIMING CONTROLLER (TASK 5.1)
// ========================================================
// Evaluates the user's slot against real-world clock time and toggles workspace panels.
function evaluateShiftGatekeeper() {
    const currentServerHour = new Date().getHours(); // Returns integer hour between 0 and 23
    
    const gatekeeperCard = document.getElementById('gatekeeper-card');
    const workspaceView = document.getElementById('workspace-view');
    const countdownClock = document.getElementById('countdown-clock');

    // Update Layout Text Elements Natively
    document.getElementById('user-slot-badge').innerText = `Slot ${currentUser.assigned_slot_id}`;
    document.getElementById('username-display').innerText = currentUser.username;

    if (currentUser.assigned_slot_id === currentServerHour) {
        // OPEN THE GATE: Reveal workspace, pull active feed tasks
        gatekeeperCard.classList.add('hidden');
        workspaceView.classList.remove('hidden');
        
        if (activeFeedLinks.length === 0) {
            fetchActiveTasksFeed();
        }
    } else {
        // CLOSE THE GATE: Hide feed workspace cards, calculate clock countdown ticks
        workspaceView.classList.add('hidden');
        gatekeeperCard.classList.remove('hidden');

        const nextWindow = new Date();
        nextWindow.setHours(currentUser.assigned_slot_id, 0, 0, 0);
        if (nextWindow < new Date()) {
            nextWindow.setDate(nextWindow.getDate() + 1); // Shift target to tomorrow if time has already passed today
        }
        
        const diffMs = nextWindow - new Date();
        const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
        const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
        const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');
        
        countdownClock.innerText = `${hrs}:${mins}:${secs}`;
    }
}

// ========================================================
// 4. API BATCH TASKS WORKSPACE OPERATIONS (TASK 5.2)
// ========================================================
async function fetchActiveTasksFeed() {
    try {
        const response = await fetch(`${API_BASE_URL}/links/feed`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}` // Passes token payload to your authMiddleware
            }
        });
        const data = await response.json();

        if (response.ok) {
            // Process links through our client randomizer before drawing any UI cards
            activeFeedLinks = shuffleLinksArray(data.feed);
            renderLinksGrid();
        } else if (response.status === 401) {
            // Handle session expiration: clear local logs and bounce to landing
            localStorage.clear();
            window.location.href = 'landing.html';
        }
    } catch (err) {
        console.error('Failed to read active cooperative feed rows:', err);
    }
}

function renderLinksGrid() {
    const gridContainer = document.getElementById('links-grid');
    gridContainer.innerHTML = ''; 

    // Dynamically print running task remaining metrics
    document.getElementById('task-counter').innerText = `Tasks Remaining to Complete: ${activeFeedLinks.length}`;

    if (activeFeedLinks.length === 0) {
        gridContainer.innerHTML = `
            <div class="card p-6 border border-zinc-200 rounded-xl bg-white text-center">
                🎉 All tasks completed! Your cooperative profile obligations are clean for this shift cycle.
            </div>`;
        return;
    }

    activeFeedLinks.forEach((link) => {
        const card = document.createElement('div');
        card.className = 'link-card';
        card.innerHTML = `
            <h4 class="font-bold text-sm tracking-tight text-zinc-800">🔊 Peer Content Boost Task</h4>
            <p class="text-xs text-zinc-400 mt-1">Origin Group Matrix: Slot ${link.slot_id}</p>
            <button class="boost-btn" onclick="executeEngagementTrigger(${link.link_id}, '${link.link_url}')">
                🚀 Open Link & Engage
            </button>
        `;
        gridContainer.appendChild(card);
    });
}

// ========================================================
// 5. ACTION TRIGGER LOG INTERACTION PIPELINE (TASK 5.3)
// ========================================================
async function executeEngagementTrigger(linkId, targetUrl) {
    // 1. Immediately open the destination Facebook link content inside a clean new browser tab
    window.open(targetUrl, '_blank');

    try {
        // 2. Fire structural verification query to the Express engine endpoints simultaneously
        const response = await fetch(`${API_BASE_URL}/links/engage`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({ link_id: linkId })
        });

        if (response.ok) {
            // 3. Strip the task out of the local memory feed array immediately on success 
            activeFeedLinks = activeFeedLinks.filter(item => item.link_id !== linkId);
            // 4. Trigger structural redraw to refresh layout counters and slide cards offscreen
            renderLinksGrid();
        }
    } catch (err) {
        console.error('Failed to log atomic interaction log row:', err);
    }
}

// ========================================================
// 6. ENGINE BOOTSTRAP INITIALIZATION
// ========================================================
window.onload = function() {
    if (loadSessionCredentials()) {
        // Fire clock ticks every 1 second to keep loop timers strictly synchronized
        setInterval(evaluateShiftGatekeeper, 1000);
        evaluateShiftGatekeeper();
    }
};
