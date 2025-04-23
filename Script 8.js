// === Script 8: Core Setup, State, Basic UI & Helpers ===
// DEL 1 av 3 (Erstatter deler av Script 2.js)
// Inneholder: Globale variabler, Initialisering, Brukerdata, Login/Logout, Grunnleggende UI, UI Hjelpere, Tema, Lyd, Mascot etc., Feed-rendering.
// Lagt til ekstra console.log i renderActivityFeed for debugging.

console.log("Script 8.js (DEL 1/3) loaded: Setup, State, Basic UI, Helpers.");

// --- Global State Variables ---
let currentUser = null;
let users = {};
let currentWorkout = []; // Workout session data (managed mostly in Script 9)
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
let activityFeedTimeout = null; // Timeout for feed updates

// --- DOM Element Variables ---
// Declared globally here, assigned in initializeDOMElements
// Note: Some elements might be primarily used by functions in other scripts,
// but fetching them here ensures they are available when needed.
let body, appContent, loginForm, userSelect, passwordInput, loginButton, statusDisplay, loggedInUserDisplay, logoutButton, notificationArea, themeButtons, viewButtons, viewSections, workoutForm, exerciseTypeSelect, customExerciseNameField, customExerciseInput, kgField, repsField, setsField, kmField, skrittField, currentSessionList, completeWorkoutButton, levelDisplay, levelEmojiDisplay, xpCurrentDisplay, xpNextLevelDisplay, xpTotalDisplay, xpProgressBar, logEntriesContainer, userListDisplay, levelUpIndicator, levelUpNewLevel, mascotElement, mascotMessage, streakCounter, retroModeButton, dailyTipContainer, snoopModal, snoopModalTitle, snoopModalLog, closeSnoopModalButton, saveDataButton, exportDataButton, importDataButton, importFileInput, dataActionMessage, motivationButton, demoModeIndicator, checkStatButton, scoreboardList, scoreboardStepsList, achievementsListContainer, workoutCommentInput, moodSelector, adminOnlyElements, adminUserSelect, adminXpAmountInput, adminGiveXpButton, adminActionMessage, adminNewUsernameInput, adminAddUserButton, adminAddUserMessage, adminExtrasButton, adminResetUserButton, adminAchievementsListDiv, adminSaveAchievementsButton, adminAchievementsMessage, adminDeleteUserButton, adminDeleteUserMessage, chatView, chatMessages, chatForm, chatInput, chatLoadingMsg, nikkoBuyXpButton, achievementIndicator, achievementIndicatorNameSpan, activityFeedContainer;

// --- Anti-Cheat Limits --- // Bør ligge i Script Level Names, men beholdes her for kompatibilitet med din opplastede fil
const MAX_WEIGHT_KG = 250; const MAX_REPS = 200; const MAX_KM_WALK = 50; const MAX_STEPS = 35000;

// --- Initialization ---
/**
 * Initializes the Firebase connection.
 */
function initializeFirebaseConnection() {
    // Assumes firebaseConfig is defined in Script Level names.js
    if (typeof firebaseConfig === 'undefined') { console.error("Firebase config missing!"); alert("Kritisk feil: Firebase-konfigurasjon mangler."); isDemoMode = true; if (demoModeIndicator) demoModeIndicator.textContent = "Demo Mode - Config Feil!"; loadDefaultUsersLocally(); processLoadedUsers(); return; }
    try {
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); console.log("Firebase initialized successfully."); }
        else { firebase.app(); console.log("Firebase already initialized."); }
        db = firebase.database(); usersRef = db.ref("users"); chatRef = db.ref("chat"); firebaseInitialized = true;
        if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Koblet til Firebase";
        loadUsersFromFirebase(); // Load data after init
    } catch (error) {
        console.error("Firebase initialization failed:", error); if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Firebase Feil!"; alert("Kunne ikke koble til Firebase. Laster standarddata.");
        isDemoMode = true; loadDefaultUsersLocally(); processLoadedUsers();
    }
}
/**
 * Fetches references to all necessary DOM elements.
 */
function initializeDOMElements() {
    console.log("Attempting to initialize DOM elements...");
    body = document.body; appContent = document.getElementById('app-content'); loginForm = document.getElementById('login-form'); userSelect = document.getElementById('user-select'); passwordInput = document.getElementById('password-input'); loginButton = document.getElementById('login-btn'); statusDisplay = document.getElementById('status'); loggedInUserDisplay = document.getElementById('logged-in-user'); logoutButton = document.getElementById('logout-button'); notificationArea = document.getElementById('notification-area'); themeButtons = document.querySelectorAll('.theme-button'); viewButtons = document.querySelectorAll('.view-button'); viewSections = document.querySelectorAll('.view-section'); workoutForm = document.getElementById('workout-form'); exerciseTypeSelect = document.getElementById('exercise-type'); customExerciseNameField = document.getElementById('custom-exercise-name-field'); customExerciseInput = document.getElementById('exercise'); kgField = document.querySelector('.form-field-kg'); repsField = document.querySelector('.form-field-reps'); setsField = document.querySelector('.form-field-sets'); kmField = document.querySelector('.form-field-km'); skrittField = document.querySelector('.form-field-skritt'); currentSessionList = document.getElementById('current-session-list'); completeWorkoutButton = document.getElementById('complete-workout-button'); levelDisplay = document.getElementById('level-display'); levelEmojiDisplay = document.getElementById('level-emoji'); xpCurrentDisplay = document.getElementById('xp-current'); xpNextLevelDisplay = document.getElementById('xp-next-level'); xpTotalDisplay = document.getElementById('xp-total'); xpProgressBar = document.getElementById('xp-progress-bar'); logEntriesContainer = document.getElementById('log-entries'); userListDisplay = document.getElementById('user-list-display'); levelUpIndicator = document.getElementById('level-up-indicator'); levelUpNewLevel = document.getElementById('level-up-new-level'); mascotElement = document.getElementById('mascot'); mascotMessage = document.getElementById('mascot-message'); streakCounter = document.getElementById('streak-counter'); retroModeButton = document.getElementById('retro-mode-button'); dailyTipContainer = document.getElementById('daily-tip-container'); snoopModal = document.getElementById('snoop-modal'); snoopModalTitle = document.getElementById('snoop-modal-title'); snoopModalLog = document.getElementById('snoop-modal-log'); closeSnoopModalButton = document.getElementById('close-snoop-modal'); saveDataButton = document.getElementById('save-data-button'); exportDataButton = document.getElementById('export-data-button'); importDataButton = document.getElementById('import-data-button'); importFileInput = document.getElementById('import-file-input'); dataActionMessage = document.getElementById('data-action-message'); motivationButton = document.getElementById('motivation-button'); demoModeIndicator = document.getElementById('demo-mode-indicator'); checkStatButton = document.getElementById('check-stat-button'); scoreboardList = document.getElementById('scoreboard-list'); scoreboardStepsList = document.getElementById('scoreboard-steps-list'); achievementsListContainer = document.getElementById('achievements-list'); workoutCommentInput = document.getElementById('workout-comment'); moodSelector = document.querySelector('.mood-selector'); adminOnlyElements = document.querySelectorAll('.admin-only'); adminUserSelect = document.getElementById('admin-user-select'); adminXpAmountInput = document.getElementById('admin-xp-amount'); adminGiveXpButton = document.getElementById('admin-give-xp-button'); adminActionMessage = document.getElementById('admin-action-message'); adminNewUsernameInput = document.getElementById('admin-new-username'); adminAddUserButton = document.getElementById('admin-add-user-button'); adminAddUserMessage = document.getElementById('admin-add-user-message'); adminExtrasButton = document.getElementById('admin-extras-button'); adminResetUserButton = document.getElementById('admin-reset-user-button'); adminAchievementsListDiv = document.getElementById('admin-achievements-list'); adminSaveAchievementsButton = document.getElementById('admin-save-achievements-button'); adminAchievementsMessage = document.getElementById('admin-achievements-message'); adminDeleteUserButton = document.getElementById('admin-delete-user-button'); adminDeleteUserMessage = document.getElementById('admin-delete-user-message'); chatView = document.getElementById('chat-view'); chatMessages = document.getElementById('chat-messages'); chatForm = document.getElementById('chat-form'); chatInput = document.getElementById('chat-input'); chatLoadingMsg = document.getElementById('chat-loading-msg'); nikkoBuyXpButton = document.getElementById('nikko-buy-xp-button'); achievementIndicator = document.getElementById('achievement-unlocked-indicator'); if (achievementIndicator) achievementIndicatorNameSpan = achievementIndicator.querySelector('.ach-name'); activityFeedContainer = document.getElementById('activity-feed');
    if (!activityFeedContainer) console.warn("Activity feed container (#activity-feed) not found.");
    if (!appContent || !loginForm || !workoutForm) { console.error("CRITICAL ERROR: Essential elements NOT found!"); }
    else { console.log("Essential DOM elements initialized successfully."); }
}

// --- User Data Handling ---
/**
 * Loads user data from Firebase RTDB.
 */
function loadUsersFromFirebase() {
    if (!firebaseInitialized || !usersRef) { console.warn("Skipping Firebase load..."); return; }
    console.log("Attempting to attach Firebase listener to /users...");
    initialDataLoaded = false;
    usersRef.on('value', (snapshot) => {
        try {
            console.log("--- Firebase 'value' event triggered ---");
            const dataFromFirebase = snapshot.val();
            const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: new Set(), timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };
            if (dataFromFirebase === null) {
                console.warn("Firebase '/users' is empty or null.");
                if (!initialDataLoaded) { console.log("Database empty, initializing locally..."); loadDefaultUsersLocally(); processLoadedUsers(); } // Added processLoadedUsers here
                else { console.log("Data became null after load. Resetting locally."); loadDefaultUsersLocally(); processLoadedUsers(); } // Added processLoadedUsers here
            } else {
                users = dataFromFirebase;
                // Data Migration/Structure/Type Conversion
                Object.keys(users).forEach(username => {
                    const defaultClone = JSON.parse(JSON.stringify(defaultUserStructure));
                    const existingStats = users[username]?.stats || {};
                    users[username] = { ...defaultClone, ...users[username] };
                    users[username].stats = { ...defaultClone.stats, ...existingStats };
                    if (Array.isArray(users[username].stats.themesTried)) {
                        users[username].stats.themesTried = new Set(users[username].stats.themesTried);
                    } else { users[username].stats.themesTried = new Set(); }
                    if (!Array.isArray(users[username].log)) users[username].log = [];
                    if (!Array.isArray(users[username].achievements)) users[username].achievements = [];
                    if (typeof users[username].stats.totalSteps !== 'number') users[username].stats.totalSteps = 0;
                    if (typeof getLevelFromTotalXP === 'function') {
                        users[username].level = getLevelFromTotalXP(users[username].xp || 0);
                    } else { users[username].level = users[username].level || 0; }
                });
                initialDataLoaded = true;
                console.log("Firebase data processed. Calling processLoadedUsers...");
                processLoadedUsers();
            }
        } catch (error) { console.error("Error inside Firebase 'value' callback:", error); if (!initialDataLoaded) { loadDefaultUsersLocally(); processLoadedUsers(); } }
    }, (error) => { console.error("Firebase read failed:", error); alert("Kunne ikke lese data."); isDemoMode = true; loadDefaultUsersLocally(); processLoadedUsers(); });
}
/**
 * Loads default user data locally.
 */
function loadDefaultUsersLocally() {
    if (initialDataLoaded && isDemoMode) return; // Avoid reloading if already loaded in demo mode
    console.log("Loading default users locally...");
     if (typeof getDefaultUsers === 'function') {
         users = getDefaultUsers();
         Object.keys(users).forEach(username => {
            if (typeof getLevelFromTotalXP === 'function') {
                users[username].level = getLevelFromTotalXP(users[username].xp || 0);
            } else { users[username].level = 0; }
         });
     }
     else { console.error("getDefaultUsers function not defined!"); users = {}; }
    initialDataLoaded = true; isDemoMode = true; if(demoModeIndicator) demoModeIndicator.textContent = "Demo Mode";
    // processLoadedUsers(); // Process is called after this in initializeFirebaseConnection error case
}
/**
 * Helper function to generate the default user structure.
 */
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
/**
 * Processes the loaded user data and updates the UI.
 */
function processLoadedUsers() {
    console.log(`processLoadedUsers called. User count: ${Object.keys(users).length}.`);
    initializeAppUI(); // Populate selects, render lists etc.
    const lastUser = localStorage.getItem('fitnessAppLastUser');
    if (lastUser && users && users[lastUser] && userSelect) { userSelect.value = lastUser; }
    processLoginLogoutUIUpdate(); // Update UI based on login state
    // Update feed (moved from initializeAppUI to ensure it runs after data processing)
    clearTimeout(activityFeedTimeout);
    activityFeedTimeout = setTimeout(renderActivityFeed, 150); // Debounce slightly
    console.log(`processLoadedUsers finished. Current user is: ${currentUser}`);
}
/**
 * Sets up UI elements that depend on user data being loaded/updated.
 */
function initializeAppUI() {
    console.log("Initializing/Refreshing App UI elements...");
    if (userSelect) populateUserSelect();
    if (typeof populateAdminUserSelect === 'function') { if (adminUserSelect) populateAdminUserSelect(); } // Function from Script 1
    if (userListDisplay && typeof renderUserList === 'function') renderUserList(); // Function from Script 9
    if ((scoreboardList || scoreboardStepsList) && typeof renderScoreboard === 'function') renderScoreboard(); // Function from Script 9
    // if (typeof renderActivityFeed === 'function') renderActivityFeed(); // Called by processLoadedUsers instead

    if (currentUser && users[currentUser]) {
        if (logEntriesContainer && typeof renderLog === 'function') renderLog(); // Function from Script 9
        if (typeof renderAchievements === 'function') { if (achievementsListContainer) renderAchievements(); } // Function from Script 9
        // Trigger graph rendering if view is active
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') renderXpPerDayChart(); // Function from Script 5
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') renderTotalXpPerDayChart(); // Function from Script 5
    }
    else {
        if (logEntriesContainer) logEntriesContainer.innerHTML = '<p class="italic">Logg inn for å se loggen.</p>';
        if (achievementsListContainer) achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>';
    }
    updateWeeklyFeatures();
    if (typeof setTheme === 'function') {
        const themeToApply = (currentUser && users[currentUser]?.theme) ? users[currentUser].theme : (localStorage.getItem('fitnessAppTheme') || 'klinkekule');
        setTheme(themeToApply);
    }
    console.log("App UI initialization/refresh complete.");
}
/**
 * Populates the main user selection dropdown.
 */
function populateUserSelect() {
    if (!userSelect) { console.error("populateUserSelect: userSelect element not found!"); return; }
    console.log("Populating user select. Users available:", Object.keys(users).length);
    if (typeof users !== 'object' || users === null || Object.keys(users).length === 0) { console.warn("populateUserSelect: users object empty/invalid.", users); userSelect.innerHTML = '<option value="" disabled selected>Laster... (Ingen data)</option>'; return; }
    const userKeys = Object.keys(users).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const currentSelection = userSelect.value;
    userSelect.innerHTML = '<option value="" disabled selected>-- Velg bruker --</option>';
    let foundSelection = false;
    userKeys.forEach(username => { const option = document.createElement('option'); option.value = username; option.textContent = username; userSelect.appendChild(option); if (username === currentSelection) foundSelection = true; });
    if (foundSelection && userKeys.includes(currentSelection)) { userSelect.value = currentSelection; } else { userSelect.value = ""; }
    console.log("User select populated. Final selected value:", userSelect.value);
}

// --- Login / Logout ---
/**
 * Logs in the specified user, updates UI and Firebase.
 * @param {string} username - The username to log in.
 */
function loginUser(username) {
    console.log(`Attempting login for: ${username}`);
    if (!users || !users[username]) { console.error(`Login failed: User ${username} not found.`); if(statusDisplay) statusDisplay.textContent = "Bruker ikke funnet."; alert("Bruker ikke funnet."); return; }
    console.log(`loginUser: Setting currentUser to: ${username}`);
    currentUser = username;
    const nowISO = new Date().toISOString();
    if (firebaseInitialized && usersRef) { usersRef.child(currentUser).update({ lastLogin: nowISO }).then(() => console.log(`Updated lastLogin for ${currentUser}.`)).catch(error => console.error(`Failed to update lastLogin:`, error)); }
    else { console.warn("Firebase not ready: Did not update lastLogin."); if (users[currentUser]) users[currentUser].lastLogin = nowISO; }
    localStorage.setItem('fitnessAppLastUser', currentUser);
    if (passwordInput) passwordInput.value = '';
    // Fjernet linje som oppdaterer #status, da info er i profilkortet
    // if (statusDisplay) statusDisplay.innerHTML = '';
    if (typeof setTheme === 'function') setTheme(users[currentUser].theme || 'klinkekule');
    console.log(`loginUser: Calling processLoginLogoutUIUpdate for user ${currentUser}`);
    processLoginLogoutUIUpdate();
    if (typeof setActiveView === 'function') setActiveView('profile');
    if (typeof updateMascot === 'function') updateMascot(`Velkommen tilbake, ${currentUser}! Klar for å knuse det?`);
    if (typeof checkAndShowSnoopNotification === 'function') checkAndShowSnoopNotification(); // Check snoop status (function in Script 9)
    console.log(`Successfully logged in as ${currentUser}`);
}
/**
 * Logs out the current user and updates the UI.
 */
function logoutUser() {
    if (typeof playButtonClickSound === 'function') playButtonClickSound();
    const loggedOutUser = currentUser;
    console.log(`logoutUser: Logging out user: ${loggedOutUser}`);
    currentUser = null;
    localStorage.removeItem('fitnessAppLastUser');
    console.log(`logoutUser: Calling processLoginLogoutUIUpdate after setting currentUser to null`);
    processLoginLogoutUIUpdate(); // Update UI for logged-out state
    if (typeof updateMascot === 'function') updateMascot(loggedOutUser ? `Logget ut, ${loggedOutUser}. Ha det bra!` : 'Logget ut.');
    if (notificationArea) notificationArea.classList.remove('show');
    if (typeof setActiveView === 'function') setActiveView('login');
    if (userSelect) userSelect.value = ""; if (statusDisplay) statusDisplay.innerHTML = "";
    console.log(`User ${loggedOutUser} logged out.`);
}
/**
 * Centralized function to handle UI updates after login, logout, or data refresh.
 */
function processLoginLogoutUIUpdate() {
    console.log(`--- processLoginLogoutUIUpdate START --- Current user: ${currentUser}`);
    updateLoginStateUI();
    if (userListDisplay && typeof renderUserList === 'function') renderUserList(); // Render user list (Script 9)
    if ((scoreboardList || scoreboardStepsList) && typeof renderScoreboard === 'function') renderScoreboard(); // Render scoreboards (Script 9)
    if (typeof renderActivityFeed === 'function') renderActivityFeed(); // Update feed

    if (currentUser && users[currentUser]) {
        console.log(`processLoginLogoutUIUpdate: User ${currentUser} is logged in. Updating specific UI.`);
        updateUI(); // Updates profile card
        if (typeof renderLog === 'function') renderLog(); // Render log (Script 9)
        if (typeof renderAchievements === 'function') renderAchievements(); // Render achievements (Script 9)
        toggleNikkoButton(currentUser === "Nikko");
        // Trigger graph rendering if view is active
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Re-rendering profile chart."); renderXpPerDayChart(); }
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Re-rendering scoreboard chart."); renderTotalXpPerDayChart(); }
    } else {
        console.log(`processLoginLogoutUIUpdate: No user logged in. Clearing specific UI.`);
        clearUserProfileUI(); // Clear profile card and potentially graphs
        if (logEntriesContainer) logEntriesContainer.innerHTML = '<p class="italic">Logg inn for å se loggen.</p>';
        if (achievementsListContainer) achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>';
        toggleNikkoButton(false);
    }
    const isAdminCheck = currentUser === "Helgrim";
    console.log(`processLoginLogoutUIUpdate: Checking admin status. isAdminCheck: ${isAdminCheck}`);
    if (typeof toggleAdminElements === 'function') toggleAdminElements(isAdminCheck); // Toggle admin UI (Script 1)
    console.log(`--- processLoginLogoutUIUpdate END ---`);
}
/**
 * Updates general UI elements based ONLY on login state (logged-in/logged-out classes).
 */
function updateLoginStateUI() {
    if (!appContent || !loggedInUserDisplay || !logoutButton || !loginForm) { console.error("updateLoginStateUI: Crucial login UI elements not found!"); return; }
    console.log(`Updating general login state UI. Current user: ${currentUser}`);
    if (currentUser) {
        appContent.classList.remove('logged-out'); appContent.classList.add('logged-in');
        loggedInUserDisplay.textContent = `Innlogget: ${currentUser}`;
    } else {
        appContent.classList.remove('logged-in'); appContent.classList.add('logged-out');
        loggedInUserDisplay.textContent = '';
    }
    // Fjernet oppdatering av #status her også, for sikkerhets skyld
    // if (statusDisplay) statusDisplay.innerHTML = ''; // Clear status on any state change
}
/**
 * Updates the user's profile card display (level, XP, streak).
 */
function updateUI() {
    if (!currentUser || !users[currentUser]) { console.log("updateUI: No current user."); clearUserProfileUI(); return; }
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
    // Fjernet oppdatering av #status her for å unngå dobbel visning
    // if (statusDisplay) statusDisplay.innerHTML = `<h2>${currentUser}</h2><p>XP: ${totalXP.toLocaleString('no-NO')}</p><p>Nivå: ${levelNames[currentLevel] || "Ukjent"} (Level ${currentLevel})</p>`;
    console.log(`UI updated for ${currentUser}: Level ${currentLevel}, XP ${totalXP}, Progress ${progress.toFixed(1)}%`);
}
/**
 * Clears the user profile UI elements when logged out or data is unavailable.
 */
function clearUserProfileUI() {
     if (levelDisplay) levelDisplay.textContent = 'Logg inn'; if (levelEmojiDisplay) levelEmojiDisplay.textContent = ''; if (xpCurrentDisplay) xpCurrentDisplay.textContent = '0';
     if (xpNextLevelDisplay) { xpNextLevelDisplay.textContent = (typeof getXPForLevelGain === 'function' ? getXPForLevelGain(1) : 10).toLocaleString('no-NO'); }
     if (xpTotalDisplay) xpTotalDisplay.textContent = '0'; if (xpProgressBar) xpProgressBar.style.width = '0%'; if (streakCounter) streakCounter.textContent = '0';
     if (statusDisplay) statusDisplay.innerHTML = ''; // Sørg for at denne også tømmes
     if (typeof renderXpPerDayChart === 'function') { console.log("Clearing profile chart (logged out)."); renderXpPerDayChart(); }
     if (typeof renderTotalXpPerDayChart === 'function') { console.log("Clearing scoreboard chart (logged out)."); renderTotalXpPerDayChart(); }
}

// --- UI Helpers ---
/**
 * Sets the currently active view/section.
 */
function setActiveView(viewId) {
    console.log("Setting active view:", viewId);
    currentActiveView = viewId; // Store the active view

    if (viewSections) { viewSections.forEach(section => { section.classList.toggle('active', section.id === `${viewId}-view`); }); }
    else { console.error("setActiveView: viewSections NodeList not found."); }

    if (viewButtons) { viewButtons.forEach(button => { const isMatchingButton = button.dataset.view === viewId; button.classList.toggle('nav-button-active', isMatchingButton); button.classList.toggle('nav-button-inactive', !isMatchingButton); }); }
    else { console.error("setActiveView: viewButtons NodeList not found."); }

    // Initialize chat listener only when chat view is activated
    if (viewId === 'chat' && !chatListenerAttached && typeof initializeChat === 'function') { initializeChat(); } // initializeChat is in Script 3

    // Render appropriate chart when view is activated
    if (viewId === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Profile view activated, rendering XP chart."); renderXpPerDayChart(); } // renderXpPerDayChart is in Script 5
    else if (viewId === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Scoreboard view activated, rendering Total XP chart."); renderTotalXpPerDayChart(); } // renderTotalXpPerDayChart is in Script 5
    // Render activity feed if that view is activated
    else if (viewId === 'activityfeed' && typeof renderActivityFeed === 'function') { console.log("Activity feed view activated, rendering feed."); renderActivityFeed(); }
}
/**
 * Displays a temporary notification message.
 */
function showNotification(message) {
    if (!notificationArea) { console.warn("showNotification: notificationArea element not found."); return; }
    notificationArea.textContent = message;
    notificationArea.classList.remove('show'); // Reset animation
    void notificationArea.offsetWidth; // Trigger reflow to restart animation
    notificationArea.classList.add('show');
}
/**
 * Triggers the visual level-up animation.
 */
function triggerLevelUpAnimation(newLevel) {
    if (!levelUpIndicator || !levelUpNewLevel) { console.warn("triggerLevelUpAnimation: Level up elements not found."); return; }
    if (typeof levelNames !== 'undefined') { levelUpNewLevel.textContent = `Nivå ${newLevel}: ${levelNames[newLevel] || 'Ukjent'}!`; }
    else { levelUpNewLevel.textContent = `Nivå ${newLevel}!`; }
    levelUpIndicator.classList.remove('show');
    void levelUpIndicator.offsetWidth;
    levelUpIndicator.classList.add('show');
    setTimeout(() => { if (levelUpIndicator) levelUpIndicator.classList.remove('show'); }, 3000);
}
/**
 * Triggers the visual achievement unlocked animation.
 */
function triggerAchievementUnlockAnimation(achievementName) {
    if (!achievementIndicator || !achievementIndicatorNameSpan) { console.warn("triggerAchievementUnlockAnimation: Achievement indicator elements not found."); showNotification(`Achievement Låst Opp: ${achievementName}!`); return; }
    console.log(`Triggering achievement pop-up for: ${achievementName}`);
    achievementIndicatorNameSpan.textContent = achievementName;
    achievementIndicator.classList.remove('show');
    void achievementIndicator.offsetWidth;
    achievementIndicator.classList.add('show');
    setTimeout(() => { if (achievementIndicator) achievementIndicator.classList.remove('show'); }, 4000);
}

// --- Theme ---
/**
 * Applies the selected theme to the application body and saves preference.
 */
function setTheme(themeName) {
    console.log("Setting theme:", themeName); if (!body || !themeName) { console.warn("setTheme: Body element or themeName missing."); return; }
    const themeClass = `theme-${themeName}`; body.className = body.className.replace(/theme-\w+/g, '').trim(); body.classList.add(themeClass); localStorage.setItem('fitnessAppTheme', themeName);
    if (currentUser && users[currentUser]) {
        const user = users[currentUser];
        if (user.theme !== themeName) {
            user.theme = themeName;
            if (!user.stats) user.stats = { themesTried: new Set() }; if (!(user.stats.themesTried instanceof Set)) user.stats.themesTried = new Set();
            user.stats.themesTried.add(themeName);
            if(typeof checkAchievements === 'function') checkAchievements(currentUser); // Check achievements (defined in Script 9)
            const themesTriedArray = Array.from(user.stats.themesTried);
            if (firebaseInitialized && usersRef) { usersRef.child(currentUser).update({ theme: themeName, 'stats/themesTried': themesTriedArray }).then(() => console.log(`Updated theme/themesTried for ${currentUser}.`)).catch(error => console.error(`Failed to update theme/themesTried:`, error)); }
            else { console.warn("Firebase not ready: Did not update theme/themesTried."); }
        }
    }
    // Re-render charts if needed, as colors depend on theme CSS variables
    if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') { console.log("Theme changed, re-rendering profile chart."); renderXpPerDayChart(); }
    if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') { console.log("Theme changed, re-rendering scoreboard chart."); renderTotalXpPerDayChart(); }
}

// --- Sound Effects ---
/**
 * Initializes the Tone.js synthesizer if not already done.
 */
async function initializeAudio() {
    if (typeof Tone !== 'undefined' && !Tone.started) { try { await Tone.start(); console.log("AudioContext started via Tone.js!"); if (!synth) { synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination(); console.log("Tone.js Synth created."); } } catch (e) { console.error("Could not start Tone.js AudioContext:", e); retroSoundEnabled = false; if(retroModeButton) retroModeButton.textContent = `Retro Mode Lyd (Feil)`; } }
    else if (typeof Tone !== 'undefined' && Tone.started && !synth) { synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 } }).toDestination(); console.log("Tone.js Synth created (context already started)."); }
    else if (typeof Tone === 'undefined') { console.warn("Tone.js library not loaded. Sound effects disabled."); retroSoundEnabled = false; }
}
/** Plays a simple click sound if retro sound is enabled. */
function playButtonClickSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { synth.triggerAttackRelease("G4", "16n", Tone.now()); } catch (e) { console.warn("Tone.js synth error (click):", e); } }
/** Plays a sound indicating XP gain if retro sound is enabled. */
function playXPSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { const now = Tone.now(); synth.triggerAttackRelease("A5", "16n", now); synth.triggerAttackRelease("C6", "16n", now + 0.08); } catch (e) { console.warn("Tone.js synth error (XP):", e); } }
/** Plays a level-up fanfare if retro sound is enabled. */
function playLevelUpSound() { if (!retroSoundEnabled || !synth || typeof Tone === 'undefined' || !Tone.started) return; try { const now = Tone.now(); synth.triggerAttackRelease("C5", "8n", now); synth.triggerAttackRelease("E5", "8n", now + 0.15); synth.triggerAttackRelease("G5", "8n", now + 0.3); synth.triggerAttackRelease("C6", "4n", now + 0.45); } catch (e) { console.warn("Tone.js synth error (LevelUp):", e); } }

// --- Mascot & Daily Tip ---
/**
 * Updates the mascot message and adds a small visual effect.
 */
function updateMascot(message) { if (mascotMessage) mascotMessage.textContent = message; if (mascotElement) { mascotElement.style.transform = 'scale(1.1)'; setTimeout(() => { if (mascotElement) mascotElement.style.transform = 'scale(1)'; }, 150); } }
/**
 * Displays the daily tip, fetching from cache or generating a new one.
 */
function displayDailyTip() {
    if (!dailyTipContainer) { console.error("Daily tip container not found!"); return; }
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
/**
 * Updates features that might change weekly.
 */
function updateWeeklyFeatures() { if (!checkStatButton) return; const today = new Date(); const isFriday = today.getDay() === 5; checkStatButton.classList.toggle('hidden', !isFriday); }

// --- Nikko's Special Button ---
/**
 * Toggles the visibility of Nikko's "Buy XP" button.
 */
function toggleNikkoButton(show) { if (nikkoBuyXpButton) { nikkoBuyXpButton.style.display = show ? 'inline-block' : 'none'; } }

// --- Activity Feed ---
/**
 * Formaterer et tidsstempel til en relativ streng (f.eks. "5 minutter siden").
 */
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
/**
 * Renders the activity feed using entryId for timestamp.
 * Added extra console logs for debugging.
 */
function renderActivityFeed() {
    console.log("RENDER ACTIVITY FEED: Starter..."); // Ny logg
    if (!activityFeedContainer) {
         console.error("RENDER ACTIVITY FEED: Containeren #activity-feed ble ikke funnet!"); // Ny logg
         return;
    }
    if (!users || Object.keys(users).length === 0) {
        console.log("RENDER ACTIVITY FEED: Ingen brukerdata tilgjengelig."); // Ny logg
        activityFeedContainer.innerHTML = '<p class="italic">Ingen brukerdata.</p>';
        return;
    }

    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    console.log(`RENDER ACTIVITY FEED: Sjekker for entries nyere enn timestamp: ${twentyFourHoursAgo}`); // Ny logg
    let activityItems = [];

    Object.entries(users).forEach(([username, userData]) => {
        if (userData && Array.isArray(userData.log)) {
            userData.log.forEach(entry => {
                const entryTimestamp = entry.entryId; // Bruker entryId som timestamp
                if (entryTimestamp && typeof entryTimestamp === 'number' && entryTimestamp >= twentyFourHoursAgo) {
                    if (entry.exercises && Array.isArray(entry.exercises)) {
                         entry.exercises.forEach(ex => {
                            if (!ex) return;
                            let text = ''; const exerciseName = ex.name || ex.type || 'en aktivitet';
                            if (ex.type === 'Gåtur' && ex.km !== undefined) text = `gikk ${ex.km.toFixed(1)} km`;
                            else if (ex.type === 'Skritt' && ex.steps !== undefined) text = `logget ${ex.steps.toLocaleString('no-NO')} skritt`;
                            else if (ex.kilos !== undefined && ex.reps !== undefined && ex.sets !== undefined) text = `trente ${exerciseName} (${ex.kilos}kg x ${ex.reps}r x ${ex.sets}s)`;
                            else if (ex.type !== 'Gåtur' && ex.type !== 'Skritt') text = `fullførte ${exerciseName}`;
                            if (text) {
                                activityItems.push({ timestamp: entryTimestamp, user: username, text: text });
                            }
                         });
                     }
                 }
             });
        }
    });

    console.log(`RENDER ACTIVITY FEED: Fant totalt ${activityItems.length} aktivitets-items innenfor 24t.`); // Ny logg

    activityItems.sort((a, b) => b.timestamp - a.timestamp);
    const itemsToShow = activityItems.slice(0, 50); // Begrenser til 50
    console.log(`RENDER ACTIVITY FEED: Viser ${itemsToShow.length} siste items.`); // Ny logg

    if (itemsToShow.length === 0) {
        activityFeedContainer.innerHTML = '<p class="italic">Ingen aktivitet siste 24 timer.</p>';
        console.log("RENDER ACTIVITY FEED: Satt innerHTML til 'Ingen aktivitet'."); // Ny logg
    } else {
        const feedHtml = itemsToShow.map(item => `<p><strong class="text-accent">${item.user}</strong> ${item.text} <span class="feed-timestamp">${formatTimeAgo(item.timestamp)}</span></p>`).join('');
        activityFeedContainer.innerHTML = feedHtml;
        console.log("RENDER ACTIVITY FEED: Oppdaterte innerHTML med faktiske aktiviteter."); // Ny logg
    }
}


// --- END OF SCRIPT 8 (DEL 1/3) ---
