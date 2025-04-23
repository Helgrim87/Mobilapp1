// === Script 2: Core Application Logic & UI Interaction ===
// Versjon: final_canvas_v2 (Basert på opplastet fungerende + Feed/Discord)
// DEL 1 av 2 MED DEBUG-LOGGER FOR LOGIN
// Inneholder: Globale variabler, Initialisering, Brukerdata, Login/Logout, Grunnleggende UI

console.log("Script 2.js (DEL 1/2) loaded: Core logic starting (v3.13 - Discord Integration).");

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
// *** NYTT: Timeout for feed ***
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
// *** NYTT: Variabel for feed container ***
let activityFeedContainer;


// --- Anti-Cheat Limits ---
const MAX_WEIGHT_KG = 250; const MAX_REPS = 200; const MAX_KM_WALK = 50; const MAX_STEPS = 35000;

// --- *** NYTT: Definisjon av feed-funksjoner (plassert tidlig) *** ---
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
 */
function renderActivityFeed() {
     // Logg for feilsøking
     console.log("Attempting to render activity feed. Container:", activityFeedContainer ? 'Found' : 'Not Found', "Users:", users ? Object.keys(users).length : 'null/undefined');

     if (!activityFeedContainer) return; // Sjekk om elementet finnes
    if (!users || Object.keys(users).length === 0) { activityFeedContainer.innerHTML = '<p class="italic">Ingen brukerdata.</p>'; return; }

    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    let activityItems = [];

    Object.entries(users).forEach(([username, userData]) => {
        if (userData && Array.isArray(userData.log)) {
            userData.log.forEach(entry => {
                // *** Bruker entryId for nøyaktig tid ***
                const entryTimestamp = entry.entryId;

                // Sjekk om entryId finnes og er innenfor tidsrammen
                if (entryTimestamp && typeof entryTimestamp === 'number' && entryTimestamp >= twentyFourHoursAgo) {
                    if (entry.exercises && Array.isArray(entry.exercises)) {
                        entry.exercises.forEach(ex => {
                            if (!ex) return; // Hopp over ugyldig øvelse
                            let text = ''; const exerciseName = ex.name || ex.type || 'en aktivitet';
                            if (ex.type === 'Gåtur' && ex.km !== undefined) text = `gikk ${ex.km.toFixed(1)} km`;
                            else if (ex.type === 'Skritt' && ex.steps !== undefined) text = `logget ${ex.steps.toLocaleString('no-NO')} skritt`;
                            else if (ex.kilos !== undefined && ex.reps !== undefined && ex.sets !== undefined) text = `trente <span class="math-inline">\{exerciseName\} \(</span>{ex.kilos}kg x ${ex.reps}r x ${ex.sets}s)`;
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
    else activityFeedContainer.innerHTML = itemsToShow.map(item => `<p><strong class="text-accent">${item.user}</strong> <span class="math-inline">\{item\.text\} <span class\="feed\-timestamp"\></span>{formatTimeAgo(item.timestamp)}</span></p>`).join('');
}
// --- *** SLUTT PÅ FEED-FUNKSJONER *** ---


// --- Initialization ---
/**
 * Initializes the Firebase connection.
 */
function initializeFirebaseConnection() {
    // (Basert på opplastet fil)
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
/**
 * Fetches references to all necessary DOM elements.
 */
function initializeDOMElements() {
    console.log("Attempting to initialize DOM elements...");
    // (Alle getElementById/querySelectorAll fra opplastet fil)
    body = document.body; appContent = document.getElementById('app-content'); loginForm = document.getElementById('login-form'); userSelect = document.getElementById('user-select'); passwordInput = document.getElementById('password-input'); loginButton = document.getElementById('login-btn'); statusDisplay = document.getElementById('status'); loggedInUserDisplay = document.getElementById('logged-in-user'); logoutButton = document.getElementById('logout-button'); notificationArea = document.getElementById('notification-area'); themeButtons = document.querySelectorAll('.theme-button'); viewButtons = document.querySelectorAll('.view-button'); viewSections = document.querySelectorAll('.view-section'); workoutForm = document.getElementById('workout-form'); exerciseTypeSelect = document.getElementById('exercise-type'); customExerciseNameField = document.getElementById('custom-exercise-name-field'); customExerciseInput = document.getElementById('exercise'); kgField = document.querySelector('.form-field-kg'); repsField = document.querySelector('.form-field-reps'); setsField = document.querySelector('.form-field-sets'); kmField = document.querySelector('.form-field-km'); skrittField = document.querySelector('.form-field-skritt'); currentSessionList = document.getElementById('current-session-list'); completeWorkoutButton = document.getElementById('complete-workout-button'); levelDisplay = document.getElementById('level-display'); levelEmojiDisplay = document.getElementById('level-emoji'); xpCurrentDisplay = document.getElementById('xp-current'); xpNextLevelDisplay = document.getElementById('xp-next-level'); xpTotalDisplay = document.getElementById('xp-total'); xpProgressBar = document.getElementById('xp-progress-bar'); logEntriesContainer = document.getElementById('log-entries'); userListDisplay = document.getElementById('user-list-display'); levelUpIndicator = document.getElementById('level-up-indicator'); levelUpNewLevel = document.getElementById('level-up-new-level'); mascotElement = document.getElementById('mascot'); mascotMessage = document.getElementById('mascot-message'); streakCounter = document.getElementById('streak-counter'); retroModeButton = document.getElementById('retro-mode-button'); dailyTipContainer = document.getElementById('daily-tip-container'); snoopModal = document.getElementById('snoop-modal'); snoopModalTitle = document.getElementById('snoop-modal-title'); snoopModalLog = document.getElementById('snoop-modal-log'); closeSnoopModalButton = document.getElementById('close-snoop-modal'); saveDataButton = document.getElementById('save-data-button'); exportDataButton = document.getElementById('export-data-button'); importDataButton = document.getElementById('import-data-button'); importFileInput = document.getElementById('import-file-input'); dataActionMessage = document.getElementById('data-action-message'); motivationButton = document.getElementById('motivation-button'); demoModeIndicator = document.getElementById('demo-mode-indicator'); checkStatButton = document.getElementById('check-stat-button'); scoreboardList = document.getElementById('scoreboard-list'); scoreboardStepsList = document.getElementById('scoreboard-steps-list'); achievementsListContainer = document.getElementById('achievements-list'); workoutCommentInput = document.getElementById('workout-comment'); moodSelector = document.querySelector('.mood-selector'); adminOnlyElements = document.querySelectorAll('.admin-only'); adminUserSelect = document.getElementById('admin-user-select'); adminXpAmountInput = document.getElementById('admin-xp-amount'); adminGiveXpButton = document.getElementById('admin-give-xp-button'); adminActionMessage = document.getElementById('admin-action-message'); adminNewUsernameInput = document.getElementById('admin-new-username'); adminAddUserButton = document.getElementById('admin-add-user-button'); adminAddUserMessage = document.getElementById('admin-add-user-message'); adminExtrasButton = document.getElementById('admin-extras-button'); adminResetUserButton = document.getElementById('admin-reset-user-button'); adminAchievementsListDiv = document.getElementById('admin-achievements-list'); adminSaveAchievementsButton = document.getElementById('admin-save-achievements-button'); adminAchievementsMessage = document.getElementById('admin-achievements-message'); adminDeleteUserButton = document.getElementById('admin-delete-user-button'); adminDeleteUserMessage = document.getElementById('admin-delete-user-message'); chatView = document.getElementById('chat-view'); chatMessages = document.getElementById('chat-messages'); chatForm = document.getElementById('chat-form'); chatInput = document.getElementById('chat-input'); chatLoadingMsg = document.getElementById('chat-loading-msg'); nikkoBuyXpButton = document.getElementById('nikko-buy-xp-button'); achievementIndicator = document.getElementById('achievement-unlocked-indicator'); if (achievementIndicator) achievementIndicatorNameSpan = achievementIndicator.querySelector('.ach-name');
    // *** Hent feed container ***
    activityFeedContainer = document.getElementById('activity-feed');
    if (!activityFeedContainer) console.warn("Activity feed container (#activity-feed) not found.");
    if (!appContent || !loginForm || !workoutForm) { console.error("CRITICAL ERROR: Essential elements NOT found!"); }
    else { console.log("Essential DOM elements initialized successfully."); }
}
/**
 * Main application initialization function.
 */
function initializeApp() {
    console.log("Initializing App (final_canvas_v2)...");
    initializeDOMElements();
    if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Initialiserer...";
    initializeFirebaseConnection();
    displayDailyTip();
    updateWeeklyFeatures();
    setupBaseEventListeners(); // ANTAR at denne funksjonen finnes i DEL 2 av scriptet ditt
    const savedTheme = localStorage.getItem('fitnessAppTheme') || 'klinkekule';
    setTheme(savedTheme);
    setActiveView('login');
    console.log("App initialization sequence complete.");
}

// --- User Data Handling ---
/**
 * Loads user data from Firebase RTDB.
 */
function loadUsersFromFirebase() {
    // (Basert på opplastet fil)
    if (!firebaseInitialized || !usersRef) { console.warn("Skipping Firebase load..."); return; }
    console.log("Attempting to attach Firebase listener to /users...");
    initialDataLoaded = false;
    usersRef.on('value', (snapshot) => {
        try {
            // ----> DEBUG LOGS LAGT TIL <----
            console.log("--- Firebase 'value' event triggered ---");
            const rawData = snapshot.val(); // Få data først
            console.log("Raw data received from Firebase:", rawData); // Log rådata
            // ----> SLUTT DEBUG <----

            const dataFromFirebase = rawData; // Bruk rådata videre
            const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: new Set(), timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };

            if (dataFromFirebase === null) {
                console.warn("Firebase '/users' is empty or null.");
                if (!initialDataLoaded) { console.log("Database empty, initializing locally..."); loadDefaultUsersLocally(); }
                else { console.log("Data became null after load. Resetting locally."); loadDefaultUsersLocally(); }
            } else {
                users = dataFromFirebase; // Sett global variabel
                // ----> DEBUG LOG LAGT TIL <----
                console.log("Global 'users' variable state AFTER assignment:", users);
                // ----> SLUTT DEBUG <----

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
    // (Basert på opplastet fil)
    if (initialDataLoaded && isDemoMode) return;
    console.log("Loading default users locally...");
     if (typeof getDefaultUsers === 'function') { users = getDefaultUsers(); Object.keys(users).forEach(username => { /* Level calc */ }); }
     else { console.error("getDefaultUsers function not defined!"); users = {}; }
    initialDataLoaded = true; isDemoMode = true; if(demoModeIndicator) demoModeIndicator.textContent = "Demo Mode";
    processLoadedUsers(); // Kall behandling
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
    // (Basert på opplastet fil)
    console.log(`processLoadedUsers called. User count: ${Object.keys(users).length}.`);
    initializeAppUI();
    const lastUser = localStorage.getItem('fitnessAppLastUser');
    if (lastUser && users && users[lastUser] && userSelect) { userSelect.value = lastUser; }
    processLoginLogoutUIUpdate();
    // *** Kall feed-oppdatering (med timeout) ***
    clearTimeout(activityFeedTimeout); activityFeedTimeout = setTimeout(renderActivityFeed, 150);
    console.log(`processLoadedUsers finished. Current user is: ${currentUser}`);
}
/**
 * Sets up UI elements that depend on user data being loaded/updated.
 */
function initializeAppUI() {
    // (Basert på opplastet fil, men med kall til renderActivityFeed)
    console.log("Initializing/Refreshing App UI elements...");
    if (userSelect) populateUserSelect();
    if (typeof populateAdminUserSelect === 'function') { if (adminUserSelect) populateAdminUserSelect(); }
    if (userListDisplay) renderUserList();
    if (scoreboardList || scoreboardStepsList) renderScoreboard();
    renderActivityFeed(); // *** Kall for å vise feed ***

    if (currentUser && users[currentUser]) {
        if (logEntriesContainer) renderLog();
        if (typeof renderAchievements === 'function') { if (achievementsListContainer) renderAchievements(); }
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') renderXpPerDayChart();
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') renderTotalXpPerDayChart();
    }
    else { /* ... clear log/achievements ... */ }
    updateWeeklyFeatures(); if (typeof setTheme === 'function') { /* ... set theme ... */ }
    console.log("App UI initialization/refresh complete.");
}
/**
 * Populates the main user selection dropdown.
 */
function populateUserSelect() {
    // ----> DEBUG LOG LAGT TIL <----
    console.log("populateUserSelect STARTING. Checking 'users' variable:", users);
    // ----> SLUTT DEBUG <----

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
    userKeys.forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        userSelect.appendChild(option);
        if (username === currentSelection) {
            foundSelection = true;
        }
    });

    if (foundSelection && userKeys.includes(currentSelection)) {
        userSelect.value = currentSelection;
    } else {
        userSelect.value = "";
    }
    console.log("User select populated. Final selected value:", userSelect.value);
}


// --- Login / Logout ---
/**
 * Logs in the specified user, updates UI and Firebase.
 * @param {string} username - The username to log in.
 */
function loginUser(username) {
    // ----> DEBUG LOG LAGT TIL <----
    console.log("loginUser STARTING for:", username);
    // ----> SLUTT DEBUG <----

    console.log(`Attempting login for: ${username}`);
    if (!users || !users[username]) {
        console.error(`Login failed: User ${username} not found in local data.`);
        if(statusDisplay) statusDisplay.textContent = "Bruker ikke funnet. Data er kanskje ikke lastet?";
        alert("Bruker ikke funnet. Prøv igjen om litt, eller sjekk om brukeren er lagt til.");
        return;
    }

    console.log(`loginUser: Setting currentUser to: ${username}`);
    currentUser = username;
    const nowISO = new Date().toISOString();

    if (firebaseInitialized && usersRef) {
        usersRef.child(currentUser).update({ lastLogin: nowISO })
            .then(() => console.log(`Updated lastLogin for ${currentUser} in RTDB.`))
            .catch(error => console.error(`Failed to update lastLogin for ${currentUser}:`, error));
    } else {
        console.warn("Firebase not ready: Did not update lastLogin in RTDB.");
        if (users[currentUser]) users[currentUser].lastLogin = nowISO;
    }

    localStorage.setItem('fitnessAppLastUser', currentUser);

    if (passwordInput) passwordInput.value = '';
    if (statusDisplay) statusDisplay.innerHTML = '';

    if (typeof setTheme === 'function') {
        setTheme(users[currentUser].theme || 'klinkekule');
    } else { console.warn("loginUser: setTheme function not found."); }

    // ----> DEBUG LOG LAGT TIL <----
    console.log("loginUser: Calling processLoginLogoutUIUpdate...");
    // ----> SLUTT DEBUG <----
    processLoginLogoutUIUpdate();

    // ----> DEBUG LOG LAGT TIL <----
    console.log("loginUser: Calling setActiveView('profile')...");
    // ----> SLUTT DEBUG <----
    if (typeof setActiveView === 'function') {
        setActiveView('profile'); // Go to profile after login
    } else { console.warn("loginUser: setActiveView function not found."); }

    if (typeof updateMascot === 'function') {
        updateMascot(`Velkommen tilbake, ${currentUser}! Klar for å knuse det?`);
    } else { console.warn("loginUser: updateMascot function not found."); }

    if (typeof checkAndShowSnoopNotification === 'function') {
        checkAndShowSnoopNotification();
    } else { console.warn("loginUser: checkAndShowSnoopNotification function not found."); }

    console.log(`Successfully logged in as ${currentUser}`);

    // ----> DEBUG LOG LAGT TIL <----
    console.log("loginUser FINISHED for:", username);
    // ----> SLUTT DEBUG <----
}

/**
 * Logs out the current user and updates the UI.
 */
function logoutUser() {
    if (typeof playButtonClickSound === 'function') {
        playButtonClickSound();
    } else { console.warn("logoutUser: playButtonClickSound function not found."); }

    const loggedOutUser = currentUser;
    console.log(`logoutUser: Logging out user: ${loggedOutUser}`);
    currentUser = null;
    localStorage.removeItem('fitnessAppLastUser');

    console.log(`logoutUser: Calling processLoginLogoutUIUpdate after setting currentUser to null`);
    processLoginLogoutUIUpdate(); // Update UI for logged-out state

    if (typeof updateMascot === 'function') {
        updateMascot(loggedOutUser ? `Logget ut, ${loggedOutUser}. Ha det bra!` : 'Logget ut.');
    } else { console.warn("logoutUser: updateMascot function not found."); }

    if (notificationArea) notificationArea.classList.remove('show');

    if (typeof setActiveView === 'function') {
        setActiveView('login'); // Go back to login screen
    } else { console.warn("logoutUser: setActiveView function not found."); }

    if (userSelect) userSelect.value = "";
    if (statusDisplay) statusDisplay.innerHTML = "";
    console.log(`User ${loggedOutUser} logged out.`);
}

/**
 * Centralized function to handle ALL UI updates after login, logout, or data refresh.
 * ** Calls graph rendering if relevant view is active. **
 * ** Calls renderActivityFeed **
 */
function processLoginLogoutUIUpdate() {
    console.log(`--- processLoginLogoutUIUpdate START --- Current user: ${currentUser}`);
    updateLoginStateUI();
    if (userListDisplay) renderUserList(); if (scoreboardList || scoreboardStepsList) renderScoreboard();
    renderActivityFeed(); // *** Oppdater feed ***

    if (currentUser && users[currentUser]) {
        console.log(`processLoginLogoutUIUpdate: User ${currentUser} is logged in. Updating specific UI.`);
        updateUI(); // Updates profile card using NEW XP logic
        renderLog(); // Renders log with potential delete buttons
        if (typeof renderAchievements === 'function') {
            renderAchievements();
        } else { console.warn("processLoginLogoutUIUpdate: renderAchievements function not found."); }
        toggleNikkoButton(currentUser === "Nikko");

        // *** Render graphs if the relevant view is currently active ***
        if (currentActiveView === 'profile' && typeof renderXpPerDayChart === 'function') {
            console.log("processLoginLogoutUIUpdate: Re-rendering profile chart due to data update.");
            renderXpPerDayChart();
        }
        if (currentActiveView === 'scoreboard' && typeof renderTotalXpPerDayChart === 'function') {
             console.log("processLoginLogoutUIUpdate: Re-rendering scoreboard chart due to data update.");
            renderTotalXpPerDayChart();
        }

    } else {
        console.log(`processLoginLogoutUIUpdate: No user logged in. Clearing specific UI.`);
        clearUserProfileUI(); // Calls chart rendering to clear them
        if (logEntriesContainer) logEntriesContainer.innerHTML = '<p class="italic">Logg inn for å se loggen.</p>';
        if (achievementsListContainer) achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>';
        toggleNikkoButton(false);
    }

    const isAdminCheck = currentUser === "Helgrim";
    console.log(`processLoginLogoutUIUpdate: Checking admin status. currentUser: ${currentUser}, isAdminCheck: ${isAdminCheck}`);
    if (typeof toggleAdminElements === 'function') {
         toggleAdminElements(isAdminCheck);
    } else {
         console.warn("processLoginLogoutUIUpdate: toggleAdminElements function not found (Script 1 might not be loaded yet).");
    }
    console.log(`--- processLoginLogoutUIUpdate END ---`);
}

/**
 * Updates general UI elements based ONLY on login state (logged-in/logged-out classes).
 */
function updateLoginStateUI() {
    if (!appContent || !loggedInUserDisplay || !logoutButton || !loginForm) {
        console.error("updateLoginStateUI: Crucial login UI elements not found!");
        return;
    }
    console.log(`Updating general login state UI. Current user: ${currentUser}`);
    if (currentUser) {
        appContent.classList.remove('logged-out');
        appContent.classList.add('logged-in');
        loggedInUserDisplay.textContent = `Innlogget: ${currentUser}`;
    } else {
        appContent.classList.remove('logged-in');
        appContent.classList.add('logged-out');
        loggedInUserDisplay.textContent = '';
    }
}

/**
 * Updates the user's profile card display (level, XP, streak).
 * ** Uses the NEW XP calculation functions. **
 */
function updateUI() {
    if (!currentUser || !users[currentUser]) {
        console.log("updateUI: No current user or user data found.");
        clearUserProfileUI();
        return;
    }
    // Ensure necessary NEW functions/data are available
    if (typeof getLevelFromTotalXP !== 'function' || typeof getTotalXPForLevel !== 'function' || typeof getXPForLevelGain !== 'function' || typeof levelNames === 'undefined' || typeof levelEmojis === 'undefined') {
        console.error("updateUI: Missing required NEW XP functions or data (getLevelFromTotalXP, getTotalXPForLevel, getXPForLevelGain, levelNames, levelEmojis).");
        return;
    }

    const user = users[currentUser];
    const totalXP = user.xp || 0;
    // Calculate level using the NEW function
    const currentLevel = getLevelFromTotalXP(totalXP);
    user.level = currentLevel; // Update the user object's level property

    // Calculate XP needed to reach the START of the current level
    const xpForCurrentLevelStart = getTotalXPForLevel(currentLevel);
    // Calculate XP needed to complete the NEXT level up (level currentLevel + 1)
    const xpNeededForThisLevelBracket = getXPForLevelGain(currentLevel + 1);
    // Calculate XP earned *within* the current level bracket
    const xpInCurrentLevel = totalXP - xpForCurrentLevelStart;

    // Calculate progress percentage for the progress bar
    const progress = xpNeededForThisLevelBracket > 0 ? Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForThisLevelBracket) * 100)) : 0;

    // Update Profile Card elements
    if (levelDisplay) levelDisplay.textContent = `${levelNames[currentLevel] || "Ukjent Nivånavn"} (Nivå ${currentLevel})`;
    if (levelEmojiDisplay) {
        const keys = Object.keys(levelEmojis).map(Number).sort((a, b) => b - a);
        const emojiKey = keys.find(key => currentLevel >= key);
        levelEmojiDisplay.textContent = emojiKey !== undefined ? levelEmojis[emojiKey] : '';
    }
    if (xpCurrentDisplay) xpCurrentDisplay.textContent = xpInCurrentLevel.toLocaleString('no-NO');
    if (xpNextLevelDisplay) xpNextLevelDisplay.textContent = xpNeededForThisLevelBracket.toLocaleString('no-NO'); // Show XP needed for this bracket
    if (xpTotalDisplay) xpTotalDisplay.textContent = totalXP.toLocaleString('no-NO');
    if (xpProgressBar) xpProgressBar.style.width = `${progress}%`;
    if (streakCounter) streakCounter.textContent = user.streak || 0;

    // Update the separate status display (if still used)
    if (statusDisplay) {
        statusDisplay.innerHTML = `<h2>${currentUser}</h2><p>XP: ${totalXP.toLocaleString('no-NO')}</p><p>Nivå: ${levelNames[currentLevel] || "Ukjent"} (Level ${currentLevel})</p>`;
    }
     console.log(`UI updated for ${currentUser}: Level ${currentLevel}, XP ${totalXP}, XP in level: <span class="math-inline">\{xpInCurrentLevel\}/</span>{xpNeededForThisLevelBracket}, Progress ${progress.toFixed(1)}%`);
}

/**
 * Clears the user profile UI elements when logged out or data is unavailable.
 * ** Also calls graph functions to clear charts. **
 */
function clearUserProfileUI() {
     if (levelDisplay) levelDisplay.textContent = 'Logg inn';
     if (levelEmojiDisplay) levelEmojiDisplay.textContent = '';
     if (xpCurrentDisplay) xpCurrentDisplay.textContent = '0';
     // Update placeholder for XP needed for level 1 using NEW function
     if (xpNextLevelDisplay) {
         if(typeof getXPForLevelGain === 'function') {
              xpNextLevelDisplay.textContent = getXPForLevelGain(1).toLocaleString('no-NO'); // XP for level 1 gain
         } else {
              xpNextLevelDisplay.textContent = '10'; // Fallback
         }
     }
     if (xpTotalDisplay) xpTotalDisplay.textContent = '0';
     if (xpProgressBar) xpProgressBar.style.width = '0%';
     if (streakCounter) streakCounter.textContent = '0';
     if (statusDisplay) statusDisplay.innerHTML = '';
     // Clear the profile chart if logged out
     if (typeof renderXpPerDayChart === 'function') {
          console.log("Clearing profile chart (logged out).");
          renderXpPerDayChart(); // Will detect no user and clear/destroy
     }
      // Clear the scoreboard chart if logged out
     if (typeof renderTotalXpPerDayChart === 'function') {
          console.log("Clearing scoreboard chart (logged out).");
          renderTotalXpPerDayChart(); // Will detect no users and clear/destroy
     }
}

// --- Workout Logging --- (Includes Anti-Cheat)

/**
 * Renders the list of activities added during the current workout session.
 * ** Updated to display steps. **
 */
function renderCurrentSession() {
     if (!currentSessionList) return;
    if (currentWorkout.length === 0) {
        currentSessionList.innerHTML = '<li class="italic">Ingen aktivitet lagt til enda...</li>';
        if (completeWorkoutButton) completeWorkoutButton.disabled = true;
        return;
    }
    currentSessionList.innerHTML = currentWorkout.map(item => {
        let details = '';
        if (item.type === 'Gåtur') { details = `${item.km} km`; }
        else if (item.type === 'Skritt') { details = `${item.steps.toLocaleString('no-NO')} skritt`; } // NEW: Display steps
        else { details = `${item.kilos}kg x ${item.reps} reps x ${item.sets} sett`; }
        const moodEmojis = { great: '😃', good: '😊', ok: '😐', meh: '😕', bad: '😩' };
        const moodEmoji = moodEmojis[item.mood] || '';
        return `<li class="text-sm"><span class="math-inline">\{item\.name\} \(</span>{details}) ${moodEmoji} - ${item.xp} XP ${item.comment ? `<i class="opacity-70">(${item.comment})</i>` : ''}</li>`;
    }).join('');
    if (completeWorkoutButton) completeWorkoutButton.disabled = false;
}

/**
 * Handles the completion of a workout session.
 * ** Adds entryId and uses the NEW getLevelFromTotalXP function. **
 * ** Adds totalSteps calculation and saving. **
 * ** Calls getRandomComment and sendToDiscord. **
 */
function completeWorkout() {
    // (Basert på opplastet fil, men med entryId og Discord-kall)
    if (currentWorkout.length === 0 || !currentUser || !users[currentUser]) return;
    if (!firebaseInitialized || !usersRef) { alert("Ingen Firebase-tilkobling."); return; }
    if (typeof playButtonClickSound !== 'function' || typeof getLevelFromTotalXP !== 'function' /*...*/ ) { console.error("completeWorkout: Mangler funksjoner!"); return; }

    const canSendDiscord = typeof sendToDiscord === 'function';
    const canGetComment = typeof getRandomComment === 'function';

    playButtonClickSound();
    const userData = users[currentUser]; const userDataRef = usersRef.child(currentUser);
    const sessionXP = currentWorkout.reduce((sum, ex) => sum + (ex.xp || 0), 0);
    const sessionVol = currentWorkout.reduce((sum, ex) => sum + (ex.type !== 'Gåtur' && ex.type !== 'Skritt' ? ((ex.kilos || 0) * (ex.reps || 0) * (ex.sets || 0)) : 0), 0);
    const sessionKm = currentWorkout.reduce((sum, ex) => sum + (ex.type === 'Gåtur' ? (ex.km || 0) : 0), 0);
    const sessionSteps = currentWorkout.reduce((sum, ex) => sum + (ex.type === 'Skritt' ? (ex.steps || 0) : 0), 0);
    const sessionMood = currentWorkout.length > 0 ? currentWorkout[currentWorkout.length - 1].mood : 'good';
    const now = new Date(); const today = now.toISOString().split('T')[0];
    const preciseTimestamp = now.getTime(); // *** Få nøyaktig tidspunkt ***

    let streak = userData.streak || 0; let lastDate = userData.lastWorkoutDate;
    let streakBonusMultiplier = 1.0; let streakBonusText = null;
    if (lastDate && lastDate !== today) { const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; if (lastDate === yesterday) streak++; else streak = 1; }
    else if (!lastDate) streak = 1;
    if (streak > 1) { streakBonusMultiplier = Math.min(1 + (streak - 1) * 0.1, 1.5); streakBonusText = `${((streakBonusMultiplier - 1)*100).toFixed(0)}% streak bonus!`; }
    const finalSessionXP = Math.round(sessionXP * streakBonusMultiplier);

    // *** Lag entry med entryId ***
    const entry = {
        entryId: preciseTimestamp, // Bruk timestamp som ID
        date: now.toLocaleString('no-NO', { dateStyle: 'short', timeStyle: 'short' }), isoDate: today, exercises: [...currentWorkout], totalXP: finalSessionXP, baseXP: sessionXP, totalVolume: sessionVol, totalKm: sessionKm, totalSteps: sessionSteps, mood: sessionMood, streakBonus: streakBonusText, streakDays: streak
    };

    if (!Array.isArray(userData.log)) userData.log = []; userData.log.unshift(entry);
    const previousLevel = userData.level; userData.xp = (userData.xp || 0) + finalSessionXP; userData.lastWorkoutDate = today; userData.streak = streak;
    if (!userData.stats) userData.stats = { /*...*/ }; if (typeof userData.stats.totalSteps !== 'number' || isNaN(userData.stats.totalSteps)) userData.stats.totalSteps = 0;
    userData.stats.totalWorkouts = (userData.stats.totalWorkouts || 0) + 1; userData.stats.totalKm = (userData.stats.totalKm || 0) + sessionKm; userData.stats.totalVolume = (userData.stats.totalVolume || 0) + sessionVol; userData.stats.totalSteps += sessionSteps; userData.stats.lastMood = sessionMood;
    userData.level = getLevelFromTotalXP(userData.xp); checkAchievements(currentUser);

    const userDataToSave = JSON.parse(JSON.stringify(userData));
    if (userDataToSave.stats?.themesTried instanceof Set) userDataToSave.stats.themesTried = Array.from(userDataToSave.stats.themesTried);
    if (!Array.isArray(userDataToSave.log)) userDataToSave.log = [];
    if (!Array.isArray(userDataToSave.achievements)) userDataToSave.achievements = [];

    userDataRef.set(userDataToSave)
        .then(() => {
            console.log(`User data saved for ${currentUser}.`);
            playXPSound();
            const levelUp = userData.level > previousLevel;
            if (levelUp) { triggerLevelUpAnimation(userData.level); playLevelUpSound(); updateMascot(`LEVEL UP, ${currentUser}! Nivå ${userData.level}! 🎉`); }
            else { updateMascot(`Økt fullført! +${finalSessionXP.toLocaleString('no-NO')} XP! ${streak > 1 ? `Streak: ${streak} dager!` : ''} 💪`); }

            // --- *** Discord Notification Logic *** ---
            if (canSendDiscord) {
                let activityTypeForComment = 'Annet'; // Default type for comment
                let firstExerciseDetails = 'en økt';
                if (entry.exercises.length > 0) {
                    const firstEx = entry.exercises[0];
                    activityTypeForComment = firstEx.type; // Use the type of the first exercise
                    if (firstEx.type === 'Gåtur') { firstExerciseDetails = `${firstEx.km} km gåtur`; activityTypeForComment = 'Gåtur'; }
                    else if (firstEx.type === 'Skritt') { firstExerciseDetails = `${(firstEx.steps || 0).toLocaleString('no-NO')} skritt`; activityTypeForComment = 'Skritt'; }
                    else if (firstEx.type !== 'Annet') { firstExerciseDetails = `<span class="math-inline">\{firstEx\.name\} \(</span>{firstEx.kilos}kg x ${firstEx.reps}r x ${firstEx.sets}s)`; activityTypeForComment = 'Styrke'; } // Assume lifting is 'Styrke'
                    else { firstExerciseDetails = `${firstEx.name}`; activityTypeForComment = 'Annet'; } // Use specific name for 'Annet'
                }

                let randomComment = "Godt jobbet!"; // Default comment
                if (canGetComment) {
                    try {
                        randomComment = getRandomComment(currentUser, activityTypeForComment);
                    } catch (e) { console.error("Error getting random comment:", e); }
                } else { console.warn("completeWorkout: getRandomComment function not found (Script 6?)."); }

                let discordMessage = `**${currentUser}** fullførte <span class="math-inline">\{firstExerciseDetails\} \(\+</span>{finalSessionXP.toLocaleString('no-NO')} XP)`;
                if(entry.streakDays > 1) discordMessage += `, _Streak: ${entry.streakDays} dager!_`;
                if(levelUp) discordMessage += `\n**LEVEL UP!** 🔥 Nådde nivå ${userData.level}!`;
                discordMessage += `\n> ${randomComment}`; // Add the comment on a new line

                sendToDiscord(discordMessage).catch(e => console.error("Async Discord send error:", e));
            } else { console.warn("completeWorkout: sendToDiscord function not found (Script 7?)."); }
            // --- *** End Discord Notification Logic *** ---

            currentWorkout = []; renderCurrentSession(); updateUI(); renderLog();
            renderActivityFeed(); // Oppdater feed
            setActiveView('profile');
        })
        .catch(error => { console.error(`Failed to save user data:`, error); alert("Feil ved lagring!"); });
}


// --- Log Rendering & Deletion ---
function renderLog() { /* ... (Keep existing implementation) ... */ }
function handleDeleteLogEntryClick(entryId) { /* ... (Keep existing implementation) ... */ }

// --- User List & Snoop ---
function renderUserList() { /* ... (Keep existing implementation) ... */ }
function showSnoopedLog(targetUsername) { /* ... (Keep existing implementation) ... */ }
function checkAndShowSnoopNotification() { /* ... (Keep existing implementation) ... */ }

// --- Scoreboard ---
function renderScoreboard() { /* ... (Keep existing implementation) ... */ }

// --- Achievements ---
function checkAchievements(username) { /* ... (Keep existing implementation) ... */ }
function renderAchievements() { /* ... (Keep existing implementation) ... */ }

// --- UI Helpers ---
function setActiveView(viewId) {
    // ----> DEBUG LOG LAGT TIL <----
    console.log(`setActiveView called with viewId: ${viewId}`);
    // ----> SLUTT DEBUG <----

    currentActiveView = viewId; // Store the active view

    if (viewSections) {
        viewSections.forEach(section => {
            const isActive = section.id === `${viewId}-view`;
            console.log(`setActiveView: Toggling active class for section: ${section.id}. Is active? ${isActive}`); // <-- DEBUG LOG
            section.classList.toggle('active', isActive);
        });
    } else { console.error("setActiveView: viewSections NodeList not found."); }

    if (viewButtons) {
        viewButtons.forEach(button => {
            const isMatchingButton = button.dataset.view === viewId;
            button.classList.toggle('nav-button-active', isMatchingButton);
            button.classList.toggle('nav-button-inactive', !isMatchingButton);
        });
    } else { console.error("setActiveView: viewButtons NodeList not found."); }

    // Initialize chat listener if chat view is activated
    if (viewId === 'chat' && !chatListenerAttached && typeof initializeChat === 'function') {
        initializeChat();
    }

    // *** Render appropriate chart when view is activated ***
    if (viewId === 'profile') {
        if (typeof renderXpPerDayChart === 'function') {
            console.log("Profile view activated, attempting to render XP chart.");
            renderXpPerDayChart(); // Call function from Script 5
        } else {
            console.warn("setActiveView: renderXpPerDayChart function (from Script 5) not found.");
            const errorElement = document.getElementById('xpChartError');
            if (errorElement) errorElement.textContent = "Graf-funksjon mangler (Script 5).";
        }
    } else if (viewId === 'scoreboard') {
         if (typeof renderTotalXpPerDayChart === 'function') {
            console.log("Scoreboard view activated, attempting to render Total XP chart.");
            renderTotalXpPerDayChart(); // Call function from Script 5
        } else {
            console.warn("setActiveView: renderTotalXpPerDayChart function (from Script 5) not found.");
            const errorElement = document.getElementById('totalXpChartError'); // Use the correct error element ID
            if (errorElement) errorElement.textContent = "Graf-funksjon mangler (Script 5).";
        }
    }
}
function showNotification(message) { /* ... (Keep existing implementation) ... */ }
function triggerLevelUpAnimation(newLevel) { /* ... (Keep existing implementation) ... */ }
function triggerAchievementUnlockAnimation(achievementName) { /* ... (Keep existing implementation) ... */ }

// --- Theme ---
function setTheme(themeName) { /* ... (Keep existing implementation) ... */ }

// --- Sound Effects ---
async function initializeAudio() { /* ... (Keep existing implementation) ... */ }
function playButtonClickSound() { /* ... (Keep existing implementation) ... */ }
function playXPSound() { /* ... (Keep existing implementation) ... */ }
function playLevelUpSound() { /* ... (Keep existing implementation) ... */ }

// --- Data Management ---
function displayDataActionMessage(message, success = true) { /* ... (Keep existing implementation) ... */ }
function exportUserData() { /* ... (Keep existing implementation) ... */ }
function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!firebaseInitialized || !usersRef) {
        alert("Kan ikke importere, Firebase ikke tilkoblet.");
        if (importFileInput) importFileInput.value = '';
        return;
    }
    if (!confirm("ADVARSEL: Dette vil OVERSKRIVE ALL eksisterende data i Firebase med innholdet i filen. Er du helt sikker?")) {
        if (importFileInput) importFileInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error("Importert data er ikke et gyldig objekt.");
            }
            console.log("Validating and preparing imported data...");
            const dataToImport = JSON.parse(JSON.stringify(importedData));
            Object.entries(dataToImport).forEach(([username, user]) => {
                // Ensure base structure and stats object, including totalSteps
                const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: [], timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };
                dataToImport[username] = { ...defaultUserStructure, ...user };
                dataToImport[username].stats = { ...defaultUserStructure.stats, ...(user.stats || {}) };
                // Ensure specific fields are correct type
                if (!Array.isArray(dataToImport[username].stats.themesTried)) dataToImport[username].stats.themesTried = [];
                if (!Array.isArray(dataToImport[username].log)) dataToImport[username].log = [];
                if (!Array.isArray(dataToImport[username].achievements)) dataToImport[username].achievements = [];
                if (typeof dataToImport[username].stats.totalSteps !== 'number') dataToImport[username].stats.totalSteps = 0; // Ensure totalSteps is number
                // Recalculate level based on imported XP
                dataToImport[username].level = getLevelFromTotalXP(dataToImport[username].xp || 0);
            });
            usersRef.set(dataToImport)
                .then(() => {
                    displayDataActionMessage("Data importert og overskrevet i Firebase!", true);
                    alert("Data importert! Appen vil nå bruke den nye dataen (kan kreve refresh eller ny innlogging).");
                    if (currentUser && dataToImport[currentUser]?.stats) {
                        usersRef.child(currentUser).child('stats/importedData').set(true).catch(err => console.error("Failed to update importedData flag", err));
                    }
                })
                .catch(error => { // catch for usersRef.set()
                    console.error("Firebase import error:", error);
                    displayDataActionMessage(`Importfeil (Firebase): ${error.message}`, false);
                    alert(`Importfeil (Firebase): ${error.message}`);
                });
        } catch (error) { // Feilhåndtering for JSON.parse eller validering
            console.error("Import file parse/validation error:", error);
            displayDataActionMessage(`Importfeil (Fil/Data): ${error.message}`, false);
            alert(`Importfeil (Fil/Data): ${error.message}`);
        } finally { // Denne kjører alltid etter try/catch
            if (importFileInput) importFileInput.value = ''; // Nullstill fil-input uansett
        }
    }; // Slutt på reader.onload

    // Definer hva som skjer ved lesefeil
    reader.onerror = (e) => {
        console.error("File read error:", e);
        displayDataActionMessage("Fil-lesefeil.", false);
        alert("Kunne ikke lese filen.");
        if (importFileInput) importFileInput.value = ''; // Nullstill
    };

    // Start lesing av filen
    reader.readAsText(file);

} // Slutt på handleDataImport


// --- Mascot & Daily Tip ---
function updateMascot(message) { /* ... (Basert på opplastet fil) ... */ }
function displayDailyTip() { /* ... (Basert på opplastet fil) ... */ }

// --- Weekly Features ---
function updateWeeklyFeatures() { /* ... (Basert på opplastet fil) ... */ }

// --- Nikko's Special Button ---
function toggleNikkoButton(show) { /* ... (Basert på opplastet fil) ... */ }

// --- Event Listener Setup ---
// MERK: setupBaseEventListeners må defineres i DEL 2 av scriptet ditt
// function setupBaseEventListeners() { /* ... */ }

// --- Run Initialization on DOM Load ---
// (Samme som din originale/fungerende versjon)
if (typeof window.appInitialized === 'undefined') {
     window.appInitialized = true;
     document.addEventListener('DOMContentLoaded', initializeApp);
} else { console.warn("Initialization script (Script 2) seems to be loaded more than once."); }
