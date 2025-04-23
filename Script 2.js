// === Script 2: Core Application Logic & UI Interaction ===
// Versjon: final_canvas_v2 (Med DEBUG-LOGGER for Login)
// MERK: Den lange linjen med "let body, appContent, ..." er fjernet herfra,
// siden disse variablene blir deklarert i Script 8.js som lastes først.
// Innholdet nedenfor er fra din opplastede fil, men sjekk om funksjonene
// logisk sett hører hjemme her eller i Script 8, 9, eller 10 etter oppdelingen.

console.log("Script 2.js (Korrigert - Uten dupliserte deklarasjoner) loaded: Core logic starting.");

// --- Global State Variables (Disse var også i din opplastede Script 2, men bør KUN defineres ETT sted, sannsynligvis Script 8) ---
// KOMMENTERER UT DISSE HER FOR SIKKERHETS SKYLD - BEKREFT AT DE ER I SCRIPT 8
/*
let currentUser = null;
let users = {};
let currentWorkout = [];
let retroSoundEnabled = false;
let synth = null;
let firebaseInitialized = false;
let db = null;
let usersRef = null;
let chatRef = null;
let initialDataLoaded = false;
let chatListenerAttached = false;
let isDemoMode = false;
let currentActiveView = null;
let activityFeedTimeout = null;
*/

// --- DOM Element Variables (Disse var også i din opplastede Script 2 - FJERNES HER) ---
// Den lange linjen 'let body, appContent, ...;' er fjernet.

// --- Anti-Cheat Limits (Disse var også i din opplastede Script 2 - Bør kun defineres ETT sted, f.eks. Script Level Names) ---
// KOMMENTERER UT DISSE HER - BEKREFT AT DE ER I SCRIPT LEVEL NAMES e.l.
/*
const MAX_WEIGHT_KG = 250; const MAX_REPS = 200; const MAX_KM_WALK = 50; const MAX_STEPS = 35000;
*/


// --- Activity Feed Functions (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function formatTimeAgo(timestamp) {
    try {
        if (!timestamp || typeof timestamp !== 'number') { return ''; }
        const now = Date.now();
        const secondsPast = Math.floor((now - timestamp) / 1000);
        if (secondsPast < 60) { return String(secondsPast) + 's siden'; }
        const minutesPast = Math.floor(secondsPast / 60);
        if (minutesPast < 60) { return String(minutesPast) + 'm siden'; }
        const hoursPast = Math.floor(minutesPast / 60);
        if (hoursPast < 24) { return String(hoursPast) + 't siden'; }
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('no-NO', { day: '2-digit', month: 'short' });
    } catch (e) { console.error("Error in formatTimeAgo:", e); return ''; }
}

function renderActivityFeed() {
     console.log("Attempting to render activity feed. Container:", activityFeedContainer ? 'Found' : 'Not Found', "Users:", users ? Object.keys(users).length : 'null/undefined');
     if (!activityFeedContainer) return;
    if (!users || Object.keys(users).length === 0) { activityFeedContainer.innerHTML = '<p class="italic">Ingen brukerdata.</p>'; return; }
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    let activityItems = [];
    Object.entries(users).forEach(([username, userData]) => {
        if (userData && Array.isArray(userData.log)) {
            userData.log.forEach(entry => {
                const entryTimestamp = entry.entryId;
                if (entryTimestamp && typeof entryTimestamp === 'number' && entryTimestamp >= twentyFourHoursAgo) {
                    if (entry.exercises && Array.isArray(entry.exercises)) {
                        entry.exercises.forEach(ex => {
                            if (!ex) return;
                            let text = ''; const exerciseName = ex.name || ex.type || 'en aktivitet';
                            // FIKS MATH SPAN FEIL: Fjernet \{ og \} og span, bruker standard template literal
                            if (ex.type === 'Gåtur' && ex.km !== undefined) text = `gikk ${ex.km.toFixed(1)} km`;
                            else if (ex.type === 'Skritt' && ex.steps !== undefined) text = `logget ${ex.steps.toLocaleString('no-NO')} skritt`;
                            else if (ex.kilos !== undefined && ex.reps !== undefined && ex.sets !== undefined) text = `trente ${exerciseName} (${ex.kilos}kg x ${ex.reps}r x ${ex.sets}s)`;
                            else if (ex.type !== 'Gåtur' && ex.type !== 'Skritt') text = `fullførte ${exerciseName}`;
                            if (text) activityItems.push({ timestamp: entryTimestamp, user: username, text: text });
                        });
                    }
                }
            });
        }
    });
    activityItems.sort((a, b) => b.timestamp - a.timestamp); const itemsToShow = activityItems.slice(0, 50);
    if (itemsToShow.length === 0) activityFeedContainer.innerHTML = '<p class="italic">Ingen aktivitet siste 24 timer.</p>';
     // FIKS MATH SPAN FEIL: Fjernet \{ og \} og span, bruker standard template literal
    else activityFeedContainer.innerHTML = itemsToShow.map(item => `<p><strong class="text-accent">${item.user}</strong> ${item.text} <span class="feed-timestamp">${formatTimeAgo(item.timestamp)}</span></p>`).join('');
}
*/

// --- Initialization (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8 & 10) ---
/*
function initializeFirebaseConnection() { ... }
function initializeDOMElements() { ... }
function initializeApp() { ... }
*/

// --- User Data Handling (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function loadUsersFromFirebase() { ... }
function loadDefaultUsersLocally() { ... }
function getDefaultUsers() { ... }
function processLoadedUsers() { ... }
function initializeAppUI() { ... }
function populateUserSelect() { ... }
*/

// --- Login / Logout (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function loginUser(username) { ... }
function logoutUser() { ... }
function processLoginLogoutUIUpdate() { ... }
function updateLoginStateUI() { ... }
function updateUI() { ... }
function clearUserProfileUI() { ... }
*/

// --- UI Helpers (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function setActiveView(viewId) { ... }
function showNotification(message) { ... }
function triggerLevelUpAnimation(newLevel) { ... }
function triggerAchievementUnlockAnimation(achievementName) { ... }
*/

// --- Theme (Denne var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function setTheme(themeName) { ... }
*/

// --- Sound Effects (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
async function initializeAudio() { ... }
function playButtonClickSound() { ... }
function playXPSound() { ... }
function playLevelUpSound() { ... }
*/

// --- Mascot & Daily Tip (Disse var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function updateMascot(message) { ... }
function displayDailyTip() { ... }
*/

// --- Weekly Features (Denne var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function updateWeeklyFeatures() { ... }
*/

// --- Nikko's Special Button (Denne var i din opplastede Script 2 - VIRKER Å VÆRE I SCRIPT 8) ---
/*
function toggleNikkoButton(show) { ... }
*/

// --- Event Listener Setup (Denne var i din opplastede Script 2 - SKAL VÆRE I SCRIPT 10) ---
/*
function setupBaseEventListeners() { ... }
*/

// --- Run Initialization on DOM Load (Denne var i din opplastede Script 2 - SKAL VÆRE I SCRIPT 10) ---
/*
if (typeof window.appInitialized === 'undefined') { ... }
*/

console.log("Script 2.js (Korrigert) processing finished. Sjekk om funksjoner over er duplisert i Script 8/9/10.");
