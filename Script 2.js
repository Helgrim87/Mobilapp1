// === Script 2: Core Application Logic & UI Interaction ===
// Versjon: final_canvas_v2 (Med DEBUG-LOGGER for Login)
// MERK: Inneholder rekonstruert setupBaseEventListeners

console.log("Script 2.js (FULL - Rekonstruert) loaded: Core logic starting (v3.13 - Discord Integration).");

// --- Global State Variables ---
let currentUser = null; // Stores the currently logged-in username
let users = {};         // Object to hold all user data fetched from Firebase
let currentWorkout = []; // Array to hold activities added during the current session
let retroSoundEnabled = false; // Flag for enabling/disabling sound effects
let synth = null;       // Tone.js synthesizer instance
let firebaseInitialized = false; // Flag indicating if Firebase connection is established
let db = null;           // Firebase Realtime Database instance
let usersRef = null;     // Firebase reference to the 'users' node
let chatRef = null;      // Firebase reference to the 'chat' node
let initialDataLoaded = false; // Flag indicating if initial user data has been loaded
let chatListenerAttached = false; // Flag to prevent attaching multiple chat listeners
let isDemoMode = false; // Set to true for local testing without Firebase
let currentActiveView = null; // Track the currently active view
let activityFeedTimeout = null;


// --- DOM Element Variables ---
// Declared here, assigned in initializeDOMElements
let body, appContent, loginForm, userSelect, passwordInput, loginButton, statusDisplay, loggedInUserDisplay, logoutButton, notificationArea, themeButtons, viewButtons, viewSections, workoutForm, exerciseTypeSelect, customExerciseNameField, customExerciseInput, kgField, repsField, setsField, kmField, skrittField, /* NEW */ currentSessionList, completeWorkoutButton, levelDisplay, levelEmojiDisplay, xpCurrentDisplay, xpNextLevelDisplay, xpTotalDisplay, xpProgressBar, logEntriesContainer, userListDisplay, levelUpIndicator, levelUpNewLevel, mascotElement, mascotMessage, streakCounter, retroModeButton, dailyTipContainer, snoopModal, snoopModalTitle, snoopModalLog, closeSnoopModalButton, saveDataButton, exportDataButton, importDataButton, importFileInput, dataActionMessage, motivationButton, demoModeIndicator, checkStatButton, scoreboardList, scoreboardStepsList, /* NEW */ achievementsListContainer, workoutCommentInput, moodSelector, adminOnlyElements, adminUserSelect, adminXpAmountInput, adminGiveXpButton, adminActionMessage, adminNewUsernameInput, adminAddUserButton, adminAddUserMessage, adminExtrasButton;
// New Admin Elements
let adminResetUserButton, adminAchievementsListDiv, adminSaveAchievementsButton, adminAchievementsMessage, adminDeleteUserButton, adminDeleteUserMessage;
// Chat elements (will be used by functions in Script 3, but fetched here)
let chatView, chatMessages, chatForm, chatInput, chatLoadingMsg;
// Nikko's special button
let nikkoBuyXpButton;
// Achievement Pop-up
let achievementIndicator, achievementIndicatorNameSpan;
// XP Chart Elements (Canvas elements are fetched inside Script 5)
let activityFeedContainer;


// --- Anti-Cheat Limits ---
const MAX_WEIGHT_KG = 250; const MAX_REPS = 200; const MAX_KM_WALK = 50; const MAX_STEPS = 35000;

// --- Activity Feed Functions ---
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


// --- Initialization ---
function initializeFirebaseConnection() {
     if (typeof firebaseConfig === 'undefined') { console.error("Firebase config is missing!"); alert("Kritisk feil: Firebase-konfigurasjon mangler."); isDemoMode = true; if (demoModeIndicator) demoModeIndicator.textContent = "Demo Mode - Config Feil!"; loadDefaultUsersLocally(); processLoadedUsers(); return; }
     try {
         if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); console.log("Firebase initialized successfully."); }
         else { firebase.app(); console.log("Firebase already initialized."); }
         db = firebase.database(); usersRef = db.ref("users"); chatRef = db.ref("chat"); firebaseInitialized = true;
         if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Koblet til Firebase";
         loadUsersFromFirebase();
     } catch (error) {
         console.error("Firebase initialization failed:", error); if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Firebase Feil!"; alert("Kunne ikke koble til Firebase. Laster standarddata.");
         isDemoMode = true; loadDefaultUsersLocally(); processLoadedUsers();
     }
}

function initializeDOMElements() {
    console.log("Attempting to initialize DOM elements...");
    body = document.body; appContent = document.getElementById('app-content'); loginForm = document.getElementById('login-form'); userSelect = document.getElementById('user-select'); passwordInput = document.getElementById('password-input'); loginButton = document.getElementById('login-btn'); statusDisplay = document.getElementById('status'); loggedInUserDisplay = document.getElementById('logged-in-user'); logoutButton = document.getElementById('logout-button'); notificationArea = document.getElementById('notification-area'); themeButtons = document.querySelectorAll('.theme-button'); viewButtons = document.querySelectorAll('.view-button'); viewSections = document.querySelectorAll('.view-section'); workoutForm = document.getElementById('workout-form'); exerciseTypeSelect = document.getElementById('exercise-type'); customExerciseNameField = document.getElementById('custom-exercise-name-field'); customExerciseInput = document.getElementById('exercise'); kgField = document.querySelector('.form-field-kg'); repsField = document.querySelector('.form-field-reps'); setsField = document.querySelector('.form-field-sets'); kmField = document.querySelector('.form-field-km'); skrittField = document.querySelector('.form-field-skritt'); currentSessionList = document.getElementById('current-session-list'); completeWorkoutButton = document.getElementById('complete-workout-button'); levelDisplay = document.getElementById('level-display'); levelEmojiDisplay = document.getElementById('level-emoji'); xpCurrentDisplay = document.getElementById('xp-current'); xpNextLevelDisplay = document.getElementById('xp-next-level'); xpTotalDisplay = document.getElementById('xp-total'); xpProgressBar = document.getElementById('xp-progress-bar'); logEntriesContainer = document.getElementById('log-entries'); userListDisplay = document.getElementById('user-list-display'); levelUpIndicator = document.getElementById('level-up-indicator'); levelUpNewLevel = document.getElementById('level-up-new-level'); mascotElement = document.getElementById('mascot'); mascotMessage = document.getElementById('mascot-message'); streakCounter = document.getElementById('streak-counter'); retroModeButton = document.getElementById('retro-mode-button'); dailyTipContainer = document.getElementById('daily-tip-container'); snoopModal = document.getElementById('snoop-modal'); snoopModalTitle = document.getElementById('snoop-modal-title'); snoopModalLog = document.getElementById('snoop-modal-log'); closeSnoopModalButton = document.getElementById('close-snoop-modal'); saveDataButton = document.getElementById('save-data-button'); exportDataButton = document.getElementById('export-data-button'); importDataButton = document.getElementById('import-data-button'); importFileInput = document.getElementById('import-file-input'); dataActionMessage = document.getElementById('data-action-message'); motivationButton = document.getElementById('motivation-button'); demoModeIndicator = document.getElementById('demo-mode-indicator'); checkStatButton = document.getElementById('check-stat-button'); scoreboardList = document.getElementById('scoreboard-list'); scoreboardStepsList = document.getElementById('scoreboard-steps-list'); achievementsListContainer = document.getElementById('achievements-list'); workoutCommentInput = document.getElementById('workout-comment'); moodSelector = document.querySelector('.mood-selector'); adminOnlyElements = document.querySelectorAll('.admin-only'); adminUserSelect = document.getElementById('admin-user-select'); adminXpAmountInput = document.getElementById('admin-xp-amount'); adminGiveXpButton = document.getElementById('admin-give-xp-button'); adminActionMessage = document.getElementById('admin-action-message'); adminNewUsernameInput = document.getElementById('admin-new-username'); adminAddUserButton = document.getElementById('admin-add-user-button'); adminAddUserMessage = document.getElementById('admin-add-user-message'); adminExtrasButton = document.getElementById('admin-extras-button'); adminResetUserButton = document.getElementById('admin-reset-user-button'); adminAchievementsListDiv = document.getElementById('admin-achievements-list'); adminSaveAchievementsButton = document.getElementById('admin-save-achievements-button'); adminAchievementsMessage = document.getElementById('admin-achievements-message'); adminDeleteUserButton = document.getElementById('admin-delete-user-button'); adminDeleteUserMessage = document.getElementById('admin-delete-user-message'); chatView = document.getElementById('chat-view'); chatMessages = document.getElementById('chat-messages'); chatForm = document.getElementById('chat-form'); chatInput = document.getElementById('chat-input'); chatLoadingMsg = document.getElementById('chat-loading-msg'); nikkoBuyXpButton = document.getElementById('nikko-buy-xp-button'); achievementIndicator = document.getElementById('achievement-unlocked-indicator'); if (achievementIndicator) achievementIndicatorNameSpan = achievementIndicator.querySelector('.ach-name');
    activityFeedContainer = document.getElementById('activity-feed');
    if (!activityFeedContainer) console.warn("Activity feed container (#activity-feed) not found.");
    if (!appContent || !loginForm || !workoutForm) { console.error("CRITICAL ERROR: Essential elements NOT found!"); }
    else { console.log("Essential DOM elements initialized successfully."); }
}

function initializeApp() {
    console.log("Initializing App (final_canvas_v2)...");
    initializeDOMElements();
    if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Initialiserer...";
    initializeFirebaseConnection();
    displayDailyTip();
    updateWeeklyFeatures();
    setupBaseEventListeners(); // Denne MÅ defineres senere i scriptet (rekonstruert nedenfor)
    const savedTheme = localStorage.getItem('fitnessAppTheme') || 'klinkekule';
    setTheme(savedTheme);
    setActiveView('login');
    console.log("App initialization sequence complete.");
}

// --- User Data Handling ---
function loadUsersFromFirebase() {
    if (!firebaseInitialized || !usersRef) { console.warn("Skipping Firebase load..."); return; }
    console.log("Attempting to attach Firebase listener to /users...");
    initialDataLoaded = false;
    usersRef.on('value', (snapshot) => {
        try {
            console.log("--- Firebase 'value' event triggered ---");
            const rawData = snapshot.val();
            console.log("Raw data received from Firebase:", rawData);

            const dataFromFirebase = rawData;
            const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: new Set(), timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };

            if (dataFromFirebase === null) {
                console.warn("Firebase '/users' is empty or null.");
                if (!initialDataLoaded) { console.log("Database empty, initializing locally..."); loadDefaultUsersLocally(); processLoadedUsers(); }
                else { console.log("Data became null after load. Resetting locally."); loadDefaultUsersLocally(); processLoadedUsers(); }
            } else {
                users = dataFromFirebase;
                console.log("Global 'users' variable state AFTER assignment:", users);

                Object.keys(users).forEach(username => {
                    const defaultClone = JSON.parse(JSON.stringify(defaultUserStructure));
                    const existingStats = users[username]?.stats || {};
                    users[username] = { ...defaultClone, ...users[username] };
                    users[username].stats = { ...defaultClone.stats, ...existingStats };
                    if (Array.isArray(users[username].stats.themesTried)) { users[username].stats.themesTried = new Set(users[username].stats.themesTried); }
                    else { users[username].stats.themesTried = new Set(); }
                    if (!Array.isArray(users[username].log)) users[username].log = [];
                    if (!Array.isArray(users[username].achievements)) users[username].achievements = [];
                    if (typeof users[username].stats.totalSteps !== 'number') users[username].stats.totalSteps = 0;
                    if (typeof getLevelFromTotalXP === 'function') { users[username].level = getLevelFromTotalXP(users[username].xp || 0); }
                    else { users[username].level = users[username].level || 0; }
                });
                initialDataLoaded = true;
                console.log("Firebase data processed. Calling processLoadedUsers...");
                processLoadedUsers();
            }
        } catch (error) { console.error("Error inside Firebase 'value' callback:", error); if (!initialDataLoaded) { loadDefaultUsersLocally(); processLoadedUsers(); } }
    }, (error) => { console.error("Firebase read failed:", error); alert("Kunne ikke lese data."); isDemoMode = true; loadDefaultUsersLocally(); processLoadedUsers(); });
}

function loadDefaultUsersLocally() {
    if (initialDataLoaded && isDemoMode) return;
    console.log("Loading default users locally...");
     if (typeof getDefaultUsers === 'function') {
         users = getDefaultUsers();
         Object.keys(users).forEach(username => {
            if (typeof getLevelFromTotalXP === 'function') { users[username].level = getLevelFromTotalXP(users[username].xp || 0); }
            else { users[username].level = 0; }
         });
     }
     else { console.error("getDefaultUsers function not defined!"); users = {}; }
    initialDataLoaded = true; isDemoMode = true; if(demoModeIndicator) demoModeIndicator.textContent = "Demo Mode";
    // processLoadedUsers(); // Ikke nødvendig her, kalles fra stedene som kaller denne
}

 function getDefaultUsers() {
     const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: new Set(), timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };
     const createUser = (theme) => {
         const user = JSON.parse(JSON.stringify(defaultUserStructure));
         user.theme = theme;
         user.stats.themesTried = new Set([theme]);
         return user;
     };
     return {
         "Helgrim": createUser('helgrim'), "krrroppekatt": createUser('krrroppekatt'), "Kennyball": createUser('kennyball'),
         "Beerbjorn": createUser('beerbjorn'), "Dardna": createUser('dardna'), "Nikko": createUser('nikko'),
         "Skytebasen": createUser('skytebasen'), "Klinkekule": createUser('klinkekule')
     };
 }

function processLoadedUsers() {
    console.log(`processLoadedUsers called. User count: ${Object.keys(users).length}.`);
    initializeAppUI();
    const lastUser = localStorage.getItem('fitnessAppLastUser');
    if (lastUser && users && users[lastUser] && userSelect) { userSelect.value = lastUser; }
    processLoginLogoutUIUpdate();
    clearTimeout(activityFeedTimeout); activityFeedTimeout = setTimeout(renderActivityFeed, 150);
    console.log(`processLoadedUsers finished. Current user is: ${currentUser}`);
}

function initializeAppUI() {
    console.log("Initializing/Refreshing App UI elements...");
    if (userSelect) populateUserSelect();
    if (typeof populateAdminUserSelect === 'function') { if (adminUserSelect) populateAdminUserSelect(); } // Script 1
    if (userListDisplay && typeof renderUserList === 'function') renderUserList(); // Script 9 (antatt)
    if ((scoreboardList || scoreboardStepsList) && typeof renderScoreboard === 'function') renderScoreboard(); // Script 9 (antatt)
    if (typeof renderActivityFeed === 'function') renderActivityFeed(); // Denne filen

    if (currentUser && users[currentUser]) {
        if (logEntriesContainer && typeof renderLog === 'function') renderLog(); // Script 9 (antatt)
        if (typeof renderAchievements === 'function') { if (achievementsListContainer) renderAchievements(); } // Script 9 (antatt)
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') renderXpPerDayChart(); // Script 5
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') renderTotalXpPerDayChart(); // Script 5
    }
    else {
        if (logEntriesContainer) logEntriesContainer.innerHTML = '<p class="italic">Logg inn for å se loggen.</p>';
        if (achievementsListContainer) achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>';
    }
    updateWeeklyFeatures(); // Denne filen
    if (typeof setTheme === 'function') { // Denne filen
        const themeToApply = (currentUser && users[currentUser]?.theme) ? users[currentUser].theme : (localStorage.getItem('fitnessAppTheme') || 'klinkekule');
        setTheme(themeToApply);
    }
    console.log("App UI initialization/refresh complete.");
}

function populateUserSelect() {
    console.log("populateUserSelect STARTING. Checking 'users' variable:", users); // DEBUG LOG

    if (!userSelect) { console.error("populateUserSelect: userSelect element not found!"); return; }
    console.log("Populating user select. Users available:", Object.keys(users).length);

    if (typeof users !== 'object' || users === null || Object.keys(users).length === 0) {
        console.warn("populateUserSelect: users object is empty or invalid. Setting placeholder.", users);
        userSelect.innerHTML = '<option value="" disabled selected>Laster... (Ingen data)</option>';
        return;
    }

    const userKeys = Object.keys(users).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const currentSelection = userSelect.value;
    userSelect.innerHTML = '<option value="" disabled selected>-- Velg bruker --</option>';
    let foundSelection = false;
    userKeys.forEach(username => { const option = document.createElement('option'); option.value = username; option.textContent = username; userSelect.appendChild(option); if (username === currentSelection) foundSelection = true; });
    if (foundSelection && userKeys.includes(currentSelection)) { userSelect.value = currentSelection; }
    else { userSelect.value = ""; }
    console.log("User select populated. Final selected value:", userSelect.value);
}


// --- Login / Logout ---
function loginUser(username) {
    console.log("loginUser STARTING for:", username); // DEBUG LOG

    console.log(`Attempting login for: ${username}`);
    if (!users || !users[username]) { console.error(`Login failed: User ${username} not found.`); if(statusDisplay) statusDisplay.textContent = "Bruker ikke funnet."; alert("Bruker ikke funnet."); return; }

    console.log(`loginUser: Setting currentUser to: ${username}`);
    currentUser = username;
    const nowISO = new Date().toISOString();

    if (firebaseInitialized && usersRef) { usersRef.child(currentUser).update({ lastLogin: nowISO }).then(() => console.log(`Updated lastLogin for ${currentUser}.`)).catch(error => console.error(`Failed to update lastLogin:`, error)); }
    else { console.warn("Firebase not ready: Did not update lastLogin."); if (users[currentUser]) users[currentUser].lastLogin = nowISO; }

    localStorage.setItem('fitnessAppLastUser', currentUser);
    if (passwordInput) passwordInput.value = ''; if (statusDisplay) statusDisplay.innerHTML = '';
    if (typeof setTheme === 'function') setTheme(users[currentUser].theme || 'klinkekule');

    console.log("loginUser: Calling processLoginLogoutUIUpdate..."); // DEBUG LOG
    processLoginLogoutUIUpdate();

    console.log("loginUser: Calling setActiveView('profile')..."); // DEBUG LOG
    if (typeof setActiveView === 'function') setActiveView('profile');
    else { console.warn("loginUser: setActiveView function not found."); }

    if (typeof updateMascot === 'function') updateMascot(`Velkommen tilbake, ${currentUser}! Klar for å knuse det?`);
    else { console.warn("loginUser: updateMascot function not found."); }

    // Antar at checkAndShowSnoopNotification finnes i en annen del/fil
    if (typeof checkAndShowSnoopNotification === 'function') checkAndShowSnoopNotification();
    else { console.warn("loginUser: checkAndShowSnoopNotification function not found."); }

    console.log(`Successfully logged in as ${currentUser}`);
    console.log("loginUser FINISHED for:", username); // DEBUG LOG
}

function logoutUser() {
    if (typeof playButtonClickSound === 'function') playButtonClickSound();
    const loggedOutUser = currentUser;
    console.log(`logoutUser: Logging out user: ${loggedOutUser}`);
    currentUser = null;
    localStorage.removeItem('fitnessAppLastUser');
    console.log(`logoutUser: Calling processLoginLogoutUIUpdate after setting currentUser to null`);
    processLoginLogoutUIUpdate();
    if (typeof updateMascot === 'function') updateMascot(loggedOutUser ? `Logget ut, ${loggedOutUser}. Ha det bra!` : 'Logget ut.');
    if (notificationArea) notificationArea.classList.remove('show');
    if (typeof setActiveView === 'function') setActiveView('login');
    if (userSelect) userSelect.value = ""; if (statusDisplay) statusDisplay.innerHTML = "";
    console.log(`User ${loggedOutUser} logged out.`);
}

function processLoginLogoutUIUpdate() {
    console.log(`--- processLoginLogoutUIUpdate START --- Current user: ${currentUser}`);
    updateLoginStateUI();
    // Antar at disse finnes i en annen del/fil
    if (userListDisplay && typeof renderUserList === 'function') renderUserList();
    if ((scoreboardList || scoreboardStepsList) && typeof renderScoreboard === 'function') renderScoreboard();
    if (typeof renderActivityFeed === 'function') renderActivityFeed();

    if (currentUser && users[currentUser]) {
        console.log(`processLoginLogoutUIUpdate: User ${currentUser} is logged in. Updating specific UI.`);
        updateUI();
        // Antar at disse finnes i en annen del/fil
        if (logEntriesContainer && typeof renderLog === 'function') renderLog();
        if (typeof renderAchievements === 'function' && achievementsListContainer) renderAchievements();
        toggleNikkoButton(currentUser === "Nikko");
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Re-rendering profile chart."); renderXpPerDayChart(); }
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Re-rendering scoreboard chart."); renderTotalXpPerDayChart(); }
    } else {
        console.log(`processLoginLogoutUIUpdate: No user logged in. Clearing specific UI.`);
        clearUserProfileUI();
        if (logEntriesContainer) logEntriesContainer.innerHTML = '<p class="italic">Logg inn for å se loggen.</p>';
        if (achievementsListContainer) achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>';
        toggleNikkoButton(false);
    }
    const isAdminCheck = currentUser === "Helgrim";
    console.log(`processLoginLogoutUIUpdate: Checking admin status. isAdminCheck: ${isAdminCheck}`);
    // Antar at toggleAdminElements finnes i Script 1
    if (typeof toggleAdminElements === 'function') toggleAdminElements(isAdminCheck);
    else console.warn("processLoginLogoutUIUpdate: toggleAdminElements function not found (Script 1?).");
    console.log(`--- processLoginLogoutUIUpdate END ---`);
}

function updateLoginStateUI() {
    if (!appContent || !loggedInUserDisplay || !logoutButton || !loginForm) { console.error("updateLoginStateUI: Crucial login UI elements not found!"); return; }
    console.log(`Updating general login state UI. Current user: ${currentUser}`);
    if (currentUser) { appContent.classList.remove('logged-out'); appContent.classList.add('logged-in'); loggedInUserDisplay.textContent = `Innlogget: ${currentUser}`; }
    else { appContent.classList.remove('logged-in'); appContent.classList.add('logged-out'); loggedInUserDisplay.textContent = ''; }
}

function updateUI() {
    if (!currentUser || !users[currentUser]) { console.log("updateUI: No current user."); clearUserProfileUI(); return; }
    // Antar XP-funksjoner fra Script Level names
    if (typeof getLevelFromTotalXP !== 'function' || typeof getTotalXPForLevel !== 'function' || typeof getXPForLevelGain !== 'function' || typeof levelNames === 'undefined' || typeof levelEmojis === 'undefined') { console.error("updateUI: Missing XP/Level functions or data."); return; }
    const user = users[currentUser]; const totalXP = user.xp || 0;
    const currentLevel = getLevelFromTotalXP(totalXP); user.level = currentLevel;
    const xpForCurrentLevelStart = getTotalXPForLevel(currentLevel);
    const xpNeededForThisLevelBracket = getXPForLevelGain(currentLevel + 1);
    const xpInCurrentLevel = totalXP - xpForCurrentLevelStart;
    const progress = xpNeededForThisLevelBracket > 0 ? Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForThisLevelBracket) * 100)) : 0;
    if (levelDisplay) levelDisplay.textContent = `${levelNames[currentLevel] || "Ukjent"} (Nivå ${currentLevel})`;
    if (levelEmojiDisplay) { const keys = Object.keys(levelEmojis).map(Number).sort((a, b) => b - a); const emojiKey = keys.find(key => currentLevel >= key); levelEmojiDisplay.textContent = emojiKey !== undefined ? levelEmojis[emojiKey] : ''; }
    if (xpCurrentDisplay) xpCurrentDisplay.textContent = xpInCurrentLevel.toLocaleString('no-NO');
    if (xpNextLevelDisplay) xpNextLevelDisplay.textContent = xpNeededForThisLevelBracket.toLocaleString('no-NO');
    if (xpTotalDisplay) xpTotalDisplay.textContent = totalXP.toLocaleString('no-NO');
    if (xpProgressBar) xpProgressBar.style.width = `${progress}%`;
    if (streakCounter) streakCounter.textContent = user.streak || 0;
    if (statusDisplay) statusDisplay.innerHTML = `<h2>${currentUser}</h2><p>XP: ${totalXP.toLocaleString('no-NO')}</p><p>Nivå: ${levelNames[currentLevel] || "Ukjent"} (Level ${currentLevel})</p>`;
    console.log(`UI updated for ${currentUser}: Level ${currentLevel}, XP ${totalXP}, Progress ${progress.toFixed(1)}%`);
}

function clearUserProfileUI() {
     if (levelDisplay) levelDisplay.textContent = 'Logg inn'; if (levelEmojiDisplay) levelEmojiDisplay.textContent = ''; if (xpCurrentDisplay) xpCurrentDisplay.textContent = '0';
     // Antar XP-funksjon fra Script Level names
     if (xpNextLevelDisplay) { xpNextLevelDisplay.textContent = (typeof getXPForLevelGain === 'function' ? getXPForLevelGain(1) : 10).toLocaleString('no-NO'); }
     if (xpTotalDisplay) xpTotalDisplay.textContent = '0'; if (xpProgressBar) xpProgressBar.style.width = '0%'; if (streakCounter) streakCounter.textContent = '0'; if (statusDisplay) statusDisplay.innerHTML = '';
     // Antar Chart-funksjoner fra Script 5
     if (typeof renderXpPerDayChart === 'function') { console.log("Clearing profile chart (logged out)."); renderXpPerDayChart(); }
     if (typeof renderTotalXpPerDayChart === 'function') { console.log("Clearing scoreboard chart (logged out)."); renderTotalXpPerDayChart(); }
}

// --- Workout Logging ---
// MERK: completeWorkout og renderCurrentSession er flyttet til Script 9 (antatt)

// --- Log Rendering & Deletion ---
// MERK: renderLog og handleDeleteLogEntryClick er flyttet til Script 9 (antatt)

// --- User List & Snoop ---
// MERK: renderUserList, showSnoopedLog, checkAndShowSnoopNotification er flyttet til Script 9 (antatt)

// --- Scoreboard ---
// MERK: renderScoreboard er flyttet til Script 9 (antatt)

// --- Achievements ---
// MERK: checkAchievements og renderAchievements er flyttet til Script 9 (antatt)


// --- UI Helpers ---
function setActiveView(viewId) {
    console.log(`setActiveView called with viewId: ${viewId}`); // DEBUG LOG
    currentActiveView = viewId;

    if (viewSections) {
        viewSections.forEach(section => {
            const isActive = section.id === `${viewId}-view`;
            console.log(`setActiveView: Toggling active class for section: ${section.id}. Is active? ${isActive}`); // DEBUG LOG
            section.classList.toggle('active', isActive);
        });
    } else { console.error("setActiveView: viewSections NodeList not found."); }

    if (viewButtons) { viewButtons.forEach(button => { const isMatchingButton = button.dataset.view === viewId; button.classList.toggle('nav-button-active', isMatchingButton); button.classList.toggle('nav-button-inactive', !isMatchingButton); }); }
    else { console.error("setActiveView: viewButtons NodeList not found."); }

    // Antar initializeChat fra Script 3
    if (viewId === 'chat' && !chatListenerAttached && typeof initializeChat === 'function') { initializeChat(); }

    // Antar Chart-funksjoner fra Script 5
    if (viewId === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Profile view activated, rendering XP chart."); renderXpPerDayChart(); }
    else if (viewId === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Scoreboard view activated, rendering Total XP chart."); renderTotalXpPerDayChart(); }
    // Antar Activity Feed-funksjon fra denne filen
    else if (viewId === 'activityfeed' && typeof renderActivityFeed === 'function') { console.log("Activity feed view activated, rendering feed."); renderActivityFeed(); }
}

function showNotification(message) {
    if (!notificationArea) { console.warn("showNotification: notificationArea element not found."); return; }
    notificationArea.textContent = message; notificationArea.classList.remove('show');
    void notificationArea.offsetWidth; notificationArea.classList.add('show');
}

function triggerLevelUpAnimation(newLevel) {
    if (!levelUpIndicator || !levelUpNewLevel) { console.warn("triggerLevelUpAnimation: Level up elements not found."); return; }
    // Antar levelNames fra Script Level names
    if (typeof levelNames !== 'undefined') { levelUpNewLevel.textContent = `Nivå ${newLevel}: ${levelNames[newLevel] || 'Ukjent'}!`; }
    else { levelUpNewLevel.textContent = `Nivå ${newLevel}!`; }
    levelUpIndicator.classList.remove('show'); void levelUpIndicator.offsetWidth; levelUpIndicator.classList.add('show');
    setTimeout(() => { if (levelUpIndicator) levelUpIndicator.classList.remove('show'); }, 3000);
}

function triggerAchievementUnlockAnimation(achievementName) {
    if (!achievementIndicator || !achievementIndicatorNameSpan) { console.warn("triggerAchievementUnlockAnimation: Achievement indicator elements not found."); showNotification(`Achievement Låst Opp: ${achievementName}!`); return; }
    console.log(`Triggering achievement pop-up for: ${achievementName}`);
    achievementIndicatorNameSpan.textContent = achievementName; achievementIndicator.classList.remove('show');
    void achievementIndicator.offsetWidth; achievementIndicator.classList.add('show');
    setTimeout(() => { if (achievementIndicator) achievementIndicator.classList.remove('show'); }, 4000);
}

// --- Theme ---
function setTheme(themeName) {
    console.log("Setting theme:", themeName); if (!body || !themeName) { console.warn("setTheme: Body element or themeName missing."); return; }
    const themeClass = `theme-${themeName}`; body.className = body.className.replace(/theme-\w+/g, '').trim(); body.classList.add(themeClass); localStorage.setItem('fitnessAppTheme', themeName);
    if (currentUser && users[currentUser]) {
        const user = users[currentUser];
        if (user.theme !== themeName) {
            user.theme = themeName;
            if (!user.stats) user.stats = { themesTried: new Set() }; if (!(user.stats.themesTried instanceof Set)) user.stats.themesTried = new Set();
            user.stats.themesTried.add(themeName);
            // Antar checkAchievements fra Script 9
            if(typeof checkAchievements === 'function') checkAchievements(currentUser);
            const themesTriedArray = Array.from(user.stats.themesTried);
            if (firebaseInitialized && usersRef) { usersRef.child(currentUser).update({ theme: themeName, 'stats/themesTried': themesTriedArray }).then(() => console.log(`Updated theme/themesTried for ${currentUser}.`)).catch(error => console.error(`Failed to update theme/themesTried:`, error)); }
            else { console.warn("Firebase not ready: Did not update theme/themesTried."); }
        }
    }
    // Antar Chart-funksjoner fra Script 5
    if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Theme changed, re-rendering profile chart."); renderXpPerDayChart(); }
    if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Theme changed, re-rendering scoreboard chart."); renderTotalXpPerDayChart(); }
}

// --- Sound Effects ---
async function initializeAudio() {
    if (typeof Tone !== 'undefined' && !Tone.started) { try { await Tone.start(); console.log("AudioContext started via Tone.js!"); if (!synth) { synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination(); console.log("Tone.js Synth created."); } } catch (e) { console.error("Could not start Tone.js AudioContext:", e); retroSoundEnabled = false; if(retroModeButton) retroModeButton.textContent = `Retro Mode Lyd (Feil)`; } }
    else if (typeof Tone !== 'undefined' && Tone.started && !synth) { synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination(); console.log("Tone.js Synth created (context already started)."); }
    else if (typeof Tone === 'undefined') { console.warn("Tone.js library not loaded. Sound effects disabled."); retroSoundEnabled = false; }
}
function playButtonClickSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { synth.triggerAttackRelease("G4", "16n", Tone.now()); } catch (e) { console.warn("Tone.js synth error (click):", e); } }
function playXPSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { const now = Tone.now(); synth.triggerAttackRelease("A5", "16n", now); synth.triggerAttackRelease("C6", "16n", now + 0.08); } catch (e) { console.warn("Tone.js synth error (XP):", e); } }
function playLevelUpSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { const now = Tone.now(); synth.triggerAttackRelease("C5", "8n", now); synth.triggerAttackRelease("E5", "8n", now + 0.15); synth.triggerAttackRelease("G5", "8n", now + 0.3); synth.triggerAttackRelease("C6", "4n", now + 0.45); } catch (e) { console.warn("Tone.js synth error (LevelUp):", e); } }

// --- Mascot & Daily Tip ---
function updateMascot(message) { if (mascotMessage) mascotMessage.textContent = message; if (mascotElement) { mascotElement.style.transform = 'scale(1.1)'; setTimeout(() => { if (mascotElement) mascotElement.style.transform = 'scale(1)'; }, 150); } }
function displayDailyTip() {
    if (!dailyTipContainer) { console.error("Daily tip container not found!"); return; }
    // Antar dailyTips fra Script Level names
    if (typeof dailyTips === 'undefined' || !Array.isArray(dailyTips) || dailyTips.length === 0) { console.error('dailyTips array is invalid or empty!'); dailyTipContainer.textContent = "Feil: Kunne ikke laste dagens tips."; return; }
    const today = new Date().toDateString(); let tip = "Laster dagens (hysteriske) tips...";
    try {
        const lastTipDate = localStorage.getItem('fitnessAppLastTipDate'); const cachedTip = localStorage.getItem('fitnessAppLastTip');
        if (lastTipDate === today && cachedTip) { tip = cachedTip; console.log("Using cached daily tip."); }
        else { const now = new Date(); const startOfYear = new Date(now.getFullYear(), 0, 0); const diff = now - startOfYear; const oneDay = 1000 * 60 * 60 * 24; const dayOfYear = Math.floor(diff / oneDay); const tipIndex = dayOfYear % dailyTips.length; tip = `Dagens Tips: ${dailyTips[tipIndex]}`; console.log(`Generated new tip (Index ${tipIndex})`); localStorage.setItem('fitnessAppLastTip', tip); localStorage.setItem('fitnessAppLastTipDate', today); console.log("Cached new tip for today."); }
        dailyTipContainer.textContent = tip;
    } catch (error) { console.error("Error displaying daily tip:", error); dailyTipContainer.textContent = "Kunne ikke laste tips pga. feil."; }
}

// --- Weekly Features ---
function updateWeeklyFeatures() { if (!checkStatButton) return; const today = new Date(); const isFriday = today.getDay() === 5; checkStatButton.classList.toggle('hidden', !isFriday); }

// --- Nikko's Special Button ---
function toggleNikkoButton(show) { if (nikkoBuyXpButton) { nikkoBuyXpButton.style.display = show ? 'inline-block' : 'none'; } }

// --- Data Management ---
// MERK: displayDataActionMessage, exportUserData, handleDataImport er flyttet til Script 9 (antatt)


// --- Event Listener Setup ---
// ===========================
// REKONSTRUERT setupBaseEventListeners basert på elementer og funksjoner
// SE OVER DENNE OG SAMMENLIGN MED DIN ORIGINALE SCRIPT 2 / SCRIPT 10
// ===========================
function setupBaseEventListeners() {
    console.log("Setting up base event listeners...");
    if (!body) { console.error("CRITICAL: Body element not available for listener setup."); return; }

    // --- User Interaction & Audio Initialization ---
    body.addEventListener('click', initializeAudio, { once: true });

    // --- Theme Buttons ---
    if (themeButtons && themeButtons.length > 0) {
        themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                playButtonClickSound();
                setTheme(button.dataset.theme);
            });
        });
    } else { console.warn("Theme buttons not found or empty!"); }

    // --- View Navigation Buttons ---
    if (viewButtons && viewButtons.length > 0) {
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                playButtonClickSound();
                setActiveView(button.dataset.view);
            });
        });
    } else { console.error("View buttons not found or empty!"); }

    // --- Login Form ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            playButtonClickSound();
            const selectedUser = userSelect?.value;
            const enteredPassword = passwordInput?.value;
            if(statusDisplay) statusDisplay.innerHTML = '';

            if (!selectedUser) {
                alert("Velg bruker.");
                if(statusDisplay) statusDisplay.textContent = "Velg en bruker fra listen.";
                return;
            }
            if (!users || !users[selectedUser]) {
                alert("Bruker ikke funnet (prøv å vent litt hvis appen nettopp lastet).");
                if(statusDisplay) statusDisplay.textContent = "Brukerdata ikke funnet. Vent eller prøv igjen.";
                return;
            }

            const correctPassword = selectedUser.charAt(0).toLowerCase(); // Simple password check

            if (enteredPassword && enteredPassword.trim().toLowerCase() === correctPassword) {
                // ----> DEBUG LOG LAGT INN HER <----
                console.log("Password OK, calling loginUser for:", selectedUser);
                // ----> SLUTT DEBUG <----
                loginUser(selectedUser); // Kaller loginUser-funksjonen
            } else {
                alert("Feil passord.");
                if(statusDisplay) statusDisplay.textContent = "Feil passord. Hint: Første bokstav i brukernavnet.";
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }
        });
    } else { console.error("Login form element NOT FOUND!"); }

    // --- Logout Button ---
    if (logoutButton) { logoutButton.addEventListener('click', logoutUser); }
    else { console.error("Logout button element NOT FOUND!"); }

    // --- Workout Form: Exercise Type Change ---
    if (exerciseTypeSelect) {
        exerciseTypeSelect.addEventListener('change', () => {
            const type = exerciseTypeSelect.value;
            const isWalk = type === 'Gåtur';
            const isSteps = type === 'Skritt';
            const isOther = type === 'Annet';
            const isLift = !isWalk && !isSteps && !isOther;

            if (kgField) kgField.classList.toggle('active', isLift || isOther);
            if (repsField) repsField.classList.toggle('active', isLift || isOther);
            if (setsField) setsField.classList.toggle('active', isLift || isOther);
            if (kmField) kmField.classList.toggle('active', isWalk);
            if (skrittField) skrittField.classList.toggle('active', isSteps);
            if (customExerciseNameField) customExerciseNameField.style.display = isOther ? 'block' : 'none';

            const kilosEl = kgField?.querySelector('input');
            const repsEl = repsField?.querySelector('input');
            const setsEl = setsField?.querySelector('input');
            const kmEl = kmField?.querySelector('input');
            const skrittEl = skrittField?.querySelector('input');
            const customNameEl = customExerciseInput;

            if (kilosEl) kilosEl.required = (isLift || isOther);
            if (repsEl) repsEl.required = (isLift || isOther);
            if (setsEl) setsEl.required = (isLift || isOther);
            if (kmEl) kmEl.required = isWalk;
            if (skrittEl) skrittEl.required = isSteps;
            if (customNameEl) customNameEl.required = isOther;
        });
        // Trigger change once initially
        exerciseTypeSelect.dispatchEvent(new Event('change'));
    } else { console.error("Exercise Type Select element NOT FOUND!"); }

    // --- Workout Form: Submit (Add Activity) ---
    if (workoutForm) {
        workoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) { alert("Logg inn først for å legge til aktivitet."); return; }
            playButtonClickSound();

            const type = exerciseTypeSelect?.value;
            let name = type === 'Annet' ? customExerciseInput?.value.trim() : type;
            let kilos = 0, reps = 0, sets = 0, km = 0, steps = 0;
            let baseXp = 0, finalXp = 0;
            let comment = workoutCommentInput?.value.trim() || '';
            let mood = document.querySelector('input[name="mood"]:checked')?.value || 'good';
            let data = { type, comment, mood }; // Start object
            let isValid = true;
            let cheatMessage = null;

            // Hent verdier og valider basert på type
             if (type === 'Gåtur') {
                 const kmInput = kmField?.querySelector('input');
                 km = parseFloat(kmInput?.value);
                 if (isNaN(km) || km <= 0) { alert("Ugyldig km."); isValid = false; }
                 else if (km > MAX_KM_WALK) { cheatMessage = `Maks ${MAX_KM_WALK} km per logg.`; isValid = false; }
                 if(isValid) { baseXp = typeof calculateWalkXP === 'function' ? calculateWalkXP(km) : 0; data = { ...data, name: `Gåtur ${km} km`, km }; }
             } else if (type === 'Skritt') {
                 const skrittInput = skrittField?.querySelector('input');
                 steps = parseInt(skrittInput?.value, 10);
                 if (isNaN(steps) || steps < 1) { alert("Ugyldig skritt."); isValid = false; }
                 else if (steps > MAX_STEPS) { cheatMessage = `Maks ${MAX_STEPS.toLocaleString('no-NO')} skritt per logg.`; isValid = false; }
                 if(isValid) { baseXp = typeof calculateStepsXP === 'function' ? calculateStepsXP(steps) : 0; data = { ...data, name: `${steps.toLocaleString('no-NO')} Skritt`, steps }; }
             } else if (type === 'Annet' || type) { // Lifting and Other
                 const kgInput = kgField?.querySelector('input');
                 const repsInput = repsField?.querySelector('input');
                 const setsInput = setsField?.querySelector('input');
                 kilos = parseFloat(kgInput?.value);
                 reps = parseInt(repsInput?.value, 10);
                 sets = parseInt(setsInput?.value, 10);
                 if (type === 'Annet' && !name) { alert("Skriv navn på 'Annet'-øvelse."); isValid = false; }
                 else if (isNaN(kilos) || isNaN(reps) || isNaN(sets) || kilos < 0 || reps < 1 || sets < 1) { alert("Ugyldig kg/reps/sets."); isValid = false; }
                 else {
                     if (kilos > MAX_WEIGHT_KG) { cheatMessage = `Maks ${MAX_WEIGHT_KG} kg per logg.`; isValid = false; }
                     if (reps > MAX_REPS) { cheatMessage = `Maks ${MAX_REPS} reps per logg.`; isValid = false; }
                 }
                 if(isValid) { baseXp = typeof calculateLiftXP === 'function' ? calculateLiftXP(kilos, reps, sets) : 0; data = { ...data, name, kilos, reps, sets }; }
             } else { alert("Velg aktivitetstype."); isValid = false; }

            if (cheatMessage) { alert(cheatMessage); showNotification(cheatMessage); isValid = false; }

            if (isValid) {
                 // Antar at adjustXPForMood finnes i Script Level names
                 finalXp = typeof adjustXPForMood === 'function' ? adjustXPForMood(baseXp, mood) : Math.max(1, Math.round(baseXp));
                 data.xp = finalXp;
                 currentWorkout.push(data);
                 // Antar renderCurrentSession fra Script 9
                 if(typeof renderCurrentSession === 'function') renderCurrentSession();
                 else console.error("renderCurrentSession function not found!");

                 workoutForm.reset();
                 const moodGood = document.getElementById('mood-good'); if (moodGood) moodGood.checked = true;
                 if (exerciseTypeSelect) exerciseTypeSelect.dispatchEvent(new Event('change'));
                 if(typeof updateMascot === 'function') updateMascot(`La til ${data.name}! Fortsett sånn!`);
            }
        });
    } else { console.error("Workout Form element NOT FOUND!"); }

    // --- Complete Workout Button ---
     // Antar completeWorkout fra Script 9
    if (completeWorkoutButton) { completeWorkoutButton.addEventListener('click', completeWorkout); }
    else { console.error("Complete Workout button element NOT FOUND!"); }

    // --- User List Snoop Button (Event Delegation) ---
    if (userListDisplay) {
        userListDisplay.addEventListener('click', (e) => {
            if (e.target.classList.contains('snoop-button')) {
                playButtonClickSound();
                const targetUsername = e.target.dataset.username;
                if (targetUsername) {
                     // Antar showSnoopedLog fra Script 9
                     if(typeof showSnoopedLog === 'function') showSnoopedLog(targetUsername);
                     else console.error("showSnoopedLog function not found!");

                    // Update Firebase/local state for snooping
                    if (firebaseInitialized && usersRef && users[targetUsername]) {
                        usersRef.child(targetUsername).update({ snooped: true })
                            .then(() => console.log(`Marked ${targetUsername} as snooped upon.`))
                            .catch(error => console.error(`Failed to mark snooped:`, error));
                        if (currentUser && users[currentUser]?.stats) {
                            // Antar checkAchievements fra Script 9
                            usersRef.child(currentUser).child('stats/timesSnooped').set(firebase.database.ServerValue.increment(1))
                                .then(() => { console.log(`Incremented timesSnooped for ${currentUser}.`); if (users[currentUser]?.stats) { users[currentUser].stats.timesSnooped = (users[currentUser].stats.timesSnooped || 0) + 1; if(typeof checkAchievements === 'function') checkAchievements(currentUser); } })
                                .catch(error => console.error(`Failed to increment timesSnooped:`, error));
                        }
                    } else { /* Handle demo mode update if needed */ }
                    console.log(`${currentUser || 'Noen'} snoket på ${targetUsername}`);
                }
            }
        });
    } else { console.error("User List Display element NOT FOUND for snoop listener!"); }

    // --- Snoop Modal Close Button ---
    if (closeSnoopModalButton) { closeSnoopModalButton.addEventListener('click', () => { playButtonClickSound(); if (snoopModal) snoopModal.classList.remove('show'); }); }
    else { console.error("Close Snoop Modal button element NOT FOUND!"); }
    // --- Snoop Modal Background Click Close ---
    if (snoopModal) { snoopModal.addEventListener('click', (e) => { if (e.target === snoopModal) { playButtonClickSound(); snoopModal.classList.remove('show'); } }); }
    else { console.error("Snoop Modal element NOT FOUND for background click listener!"); }

    // --- Admin Panel Buttons (Assuming functions in Script 1) ---
    if (adminGiveXpButton) { adminGiveXpButton.addEventListener('click', () => { playButtonClickSound(); if (typeof adminAdjustXp === 'function') adminAdjustXp(); else console.error("adminAdjustXp function not found!"); }); }
    if (adminAddUserButton) { adminAddUserButton.addEventListener('click', () => { playButtonClickSound(); if (typeof adminAddNewUser === 'function') adminAddNewUser(); else console.error("adminAddNewUser function not found!"); }); }
    if (adminResetUserButton) { adminResetUserButton.addEventListener('click', () => { playButtonClickSound(); if (typeof adminResetUser === 'function') adminResetUser(); else console.error("adminResetUser function not found!"); }); }
    if (adminSaveAchievementsButton) { adminSaveAchievementsButton.addEventListener('click', () => { playButtonClickSound(); if (typeof adminSaveChanges === 'function') adminSaveChanges(); else console.error("adminSaveChanges function not found!"); }); }
    if (adminDeleteUserButton) { adminDeleteUserButton.addEventListener('click', () => { playButtonClickSound(); if (typeof adminDeleteUser === 'function') adminDeleteUser(); else console.error("adminDeleteUser function not found!"); }); }
    // Admin user select change listener
    if (adminUserSelect) { adminUserSelect.addEventListener('change', () => { if (typeof adminPopulateAchievements === 'function') adminPopulateAchievements(); else console.error("adminPopulateAchievements function not found!"); }); }

    // --- Data Management Buttons (Assuming functions in Script 9) ---
    if (saveDataButton) { saveDataButton.addEventListener('click', () => { playButtonClickSound(); if (!firebaseInitialized) displayDataActionMessage("Firebase ikke tilkoblet!", false); else displayDataActionMessage("Data lagres automatisk!", true); }); }
    if (exportDataButton) { exportDataButton.addEventListener('click', exportUserData); } else { console.error("Export Data button element NOT FOUND!"); }
    if (importDataButton && importFileInput) { importDataButton.addEventListener('click', () => { playButtonClickSound(); importFileInput.click(); }); importFileInput.addEventListener('change', handleDataImport); }
    else { console.error("Import Data button or File Input element NOT FOUND!"); }

    // --- Extras Tab Buttons ---
    if (retroModeButton) { retroModeButton.addEventListener('click', () => { initializeAudio().then(() => { retroSoundEnabled = !retroSoundEnabled; retroModeButton.textContent = `Retro Mode Lyd (${retroSoundEnabled ? 'På' : 'Av'})`; updateMascot(retroSoundEnabled ? "8-bit lyd aktivert!" : "Moderne lydmodus."); playButtonClickSound(); }); }); }
    else { console.error("Retro Mode button element NOT FOUND!"); }

    if (motivationButton) { motivationButton.addEventListener('click', () => { playButtonClickSound(); if (typeof motivationMessages !== 'undefined' && motivationMessages.length > 0) { const randomIndex = Math.floor(Math.random() * motivationMessages.length); updateMascot(motivationMessages[randomIndex]); } else { updateMascot("Fant ingen motivasjon..."); } }); }
    else { console.error("Motivation button element NOT FOUND!"); }

    if (checkStatButton) { checkStatButton.addEventListener('click', () => { playButtonClickSound(); if(typeof renderScoreboard === 'function') renderScoreboard(); setActiveView('scoreboard'); }); }
    if (adminExtrasButton) { adminExtrasButton.addEventListener('click', () => { playButtonClickSound(); setActiveView('admin'); }); }

    // --- Nikko's "Buy XP" Button ---
    if (nikkoBuyXpButton) { nikkoBuyXpButton.addEventListener('click', () => { playButtonClickSound(); const msg = "Pay-to-win? Ikke her! 😉 Gotcha, Nikko!"; showNotification(msg); updateMascot(msg); }); }

    // --- Chat Form Listener (Assuming function in Script 3) ---
    if (chatForm) { chatForm.addEventListener('submit', (e) => { e.preventDefault(); if (typeof sendChatMessage === 'function') sendChatMessage(); else console.error("sendChatMessage function not found."); }); }
    else { console.error("Chat Form element NOT FOUND!"); }

    // --- Log Entry Delete Button (Event Delegation - Assuming function in Script 9) ---
    if (logEntriesContainer) {
        logEntriesContainer.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-log-button');
            if (deleteButton) {
                playButtonClickSound();
                const entryId = deleteButton.dataset.entryId;
                const entryIdNum = parseInt(entryId, 10);
                if (!isNaN(entryIdNum)) {
                    if(typeof handleDeleteLogEntryClick === 'function') handleDeleteLogEntryClick(entryIdNum);
                    else console.error("handleDeleteLogEntryClick function not found!");
                } else { console.error("Invalid entryId found on delete button:", entryId); }
            }
        });
    } else { console.error("Log Entries Container not found for delete listener setup!"); }

    console.log("Base event listeners setup complete.");
} // --- End of setupBaseEventListeners ---


// --- Run Initialization on DOM Load ---
if (typeof window.appInitialized === 'undefined') {
     window.appInitialized = true;
     document.addEventListener('DOMContentLoaded', initializeApp);
} else { console.warn("Initialization script (Script 2) seems to be loaded more than once."); }
