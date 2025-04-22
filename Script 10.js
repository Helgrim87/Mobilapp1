// === Script 10: Event Listeners & App Initialization ===
// DEL 3 av 3 (Erstatter deler av Script 2.js)
// Inneholder: Oppsett av alle event listeners og hoved-initialiseringen av appen.
// AVHENGIGHETER: Krever at Script 1, 3, 4, 5, 6, 7, 8, og 9 er lastet FØR denne.

console.log("Script 10.js (DEL 3/3) loaded: Event Listeners & App Init.");

// --- Event Listener Setup ---

/**
 * Attaches all necessary event listeners to DOM elements.
 * Calls functions defined in Script 8 (UI, State, Helpers) and Script 9 (Logic, Display).
 * Also calls functions from Script 1 (Admin) and Script 3 (Chat).
 */
function setupBaseEventListeners() {
    console.log("Setting up base event listeners...");
    if (!body) { console.error("CRITICAL: Body element not available for listener setup."); return; }

    // --- User Interaction & Audio Initialization (Script 8) ---
    if (typeof initializeAudio === 'function') {
        body.addEventListener('click', initializeAudio, { once: true });
    } else { console.error("setupBaseEventListeners: initializeAudio function not found (Script 8?)."); }


    // --- Theme Buttons (Script 8) ---
    if (themeButtons && themeButtons.length > 0) {
        themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (typeof playButtonClickSound === 'function') playButtonClickSound();
                if (typeof setTheme === 'function') setTheme(button.dataset.theme);
            });
        });
    }
    else { console.warn("Theme buttons not found or empty!"); }

    // --- View Navigation Buttons (Script 8) ---
    if (viewButtons && viewButtons.length > 0) {
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (typeof playButtonClickSound === 'function') playButtonClickSound();
                if (typeof setActiveView === 'function') setActiveView(button.dataset.view);
            });
        });
    }
    else { console.error("View buttons not found or empty!"); }

    // --- Login Form (Script 8) ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof playButtonClickSound === 'function') playButtonClickSound();
            const selectedUser = userSelect?.value;
            const enteredPassword = passwordInput?.value;
            if(statusDisplay) statusDisplay.innerHTML = '';
            if (!selectedUser) { alert("Velg bruker."); if(statusDisplay) statusDisplay.textContent = "Velg en bruker fra listen."; return; }
            if (!users || !users[selectedUser]) { alert("Bruker ikke funnet (prøv å vent litt hvis appen nettopp lastet)."); if(statusDisplay) statusDisplay.textContent = "Brukerdata ikke funnet. Vent eller prøv igjen."; return; }
            const correctPassword = selectedUser.charAt(0).toLowerCase();
            if (enteredPassword && enteredPassword.trim().toLowerCase() === correctPassword) {
                if (typeof loginUser === 'function') loginUser(selectedUser); // Function from Script 8
                else console.error("setupBaseEventListeners: loginUser function not found (Script 8?).");
            } else {
                alert("Feil passord."); if(statusDisplay) statusDisplay.textContent = "Feil passord. Hint: Første bokstav i brukernavnet.";
                if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
            }
        });
    }
    else { console.error("Login form element NOT FOUND!"); }

    // --- Logout Button (Script 8) ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (typeof logoutUser === 'function') logoutUser(); // Function from Script 8
            else console.error("setupBaseEventListeners: logoutUser function not found (Script 8?).");
        });
    }
    else { console.error("Logout button element NOT FOUND!"); }

    // --- Workout Form: Exercise Type Change (UI Logic in Script 8, handled here) ---
    if (exerciseTypeSelect) {
        exerciseTypeSelect.addEventListener('change', () => {
            const type = exerciseTypeSelect.value;
            const isWalk = type === 'Gåtur';
            const isSteps = type === 'Skritt';
            const isOther = type === 'Annet';
            const isLift = !isWalk && !isSteps && !isOther;

            // Toggle field visibility
            if (kgField) kgField.classList.toggle('active', isLift || isOther);
            if (repsField) repsField.classList.toggle('active', isLift || isOther);
            if (setsField) setsField.classList.toggle('active', isLift || isOther);
            if (kmField) kmField.classList.toggle('active', isWalk);
            if (skrittField) skrittField.classList.toggle('active', isSteps);
            if (customExerciseNameField) customExerciseNameField.style.display = isOther ? 'block' : 'none';

            // Set required attributes
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
         if(exerciseTypeSelect.value === "") { // Only if no value is pre-selected
            exerciseTypeSelect.dispatchEvent(new Event('change'));
         }
    }
    else { console.error("Exercise Type Select element NOT FOUND!"); }

    // --- Workout Form: Submit (Add Activity - Logic in Script 9) ---
    if (workoutForm) {
        workoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) { alert("Logg inn først for å legge til aktivitet."); return; }
            if (typeof playButtonClickSound === 'function') playButtonClickSound();

            const type = exerciseTypeSelect?.value;
            let name = type === 'Annet' ? customExerciseInput?.value.trim() : type;
            let kilos = 0, reps = 0, sets = 0, km = 0, steps = 0;
            let baseXp = 0, finalXp = 0;
            let comment = workoutCommentInput?.value.trim() || '';
            let mood = document.querySelector('input[name="mood"]:checked')?.value || 'good';
            let data = { type, comment, mood };
            let isValid = true;
            let cheatMessage = null;

            // Validation and XP calculation logic (moved from old Script 2)
            // Assumes calculation functions are available (Script Level names)
            if (type === 'Gåtur') {
                const kmInput = kmField?.querySelector('input');
                km = parseFloat(kmInput?.value);
                if (isNaN(km) || km <= 0) { alert("Ugyldig verdi for kilometer."); isValid = false; }
                else if (km > MAX_KM_WALK) { cheatMessage = `Nå jukser du vel litt? ${MAX_KM_WALK} km er maks per gåtur-logg.`; isValid = false; }
                if(isValid && typeof calculateWalkXP === 'function') { baseXp = calculateWalkXP(km); data = { ...data, name: `Gåtur ${km} km`, km }; }
                else if (isValid) { console.error("calculateWalkXP function not found!"); isValid = false; }
            } else if (type === 'Skritt') {
                const skrittInput = skrittField?.querySelector('input');
                steps = parseInt(skrittInput?.value, 10);
                if (isNaN(steps) || steps < 1) { alert("Ugyldig verdi for skritt (må være minst 1)."); isValid = false; }
                else if (steps > MAX_STEPS) { cheatMessage = `Nå jukser du vel litt? ${MAX_STEPS.toLocaleString('no-NO')} skritt er maks per logg.`; isValid = false; }
                if(isValid && typeof calculateStepsXP === 'function') { baseXp = calculateStepsXP(steps); data = { ...data, name: `${steps.toLocaleString('no-NO')} Skritt`, steps }; }
                 else if (isValid) { console.error("calculateStepsXP function not found!"); isValid = false; }
            } else if (type === 'Annet' || type) { // Lifting or Other
                const kgInput = kgField?.querySelector('input');
                const repsInput = repsField?.querySelector('input');
                const setsInput = setsField?.querySelector('input');
                kilos = parseFloat(kgInput?.value); reps = parseInt(repsInput?.value, 10); sets = parseInt(setsInput?.value, 10);
                if (type === 'Annet' && !name) { alert("Skriv inn navn på 'Annet'-øvelse."); isValid = false; }
                else if (isNaN(kilos) || isNaN(reps) || isNaN(sets) || kilos < 0 || reps < 1 || sets < 1) { alert("Ugyldige verdier for kg/reps/sets."); isValid = false; }
                else {
                    if (kilos > MAX_WEIGHT_KG) { cheatMessage = `Nå jukser du! ${MAX_WEIGHT_KG} kg er maks vekt.`; isValid = false; }
                    if (reps > MAX_REPS) { cheatMessage = `Nå jukser du! ${MAX_REPS} reps er maks.`; isValid = false; }
                }
                if(isValid && typeof calculateLiftXP === 'function') { baseXp = calculateLiftXP(kilos, reps, sets); data = { ...data, name, kilos, reps, sets }; }
                 else if (isValid) { console.error("calculateLiftXP function not found!"); isValid = false; }
            } else { alert("Velg en aktivitetstype."); isValid = false; }

            if (cheatMessage) { alert(cheatMessage); if(typeof showNotification === 'function') showNotification(cheatMessage); isValid = false; }

            if (isValid) {
                if (typeof adjustXPForMood === 'function') {
                    finalXp = adjustXPForMood(baseXp, mood);
                    data.xp = finalXp;
                    currentWorkout.push(data);
                    if (typeof renderCurrentSession === 'function') renderCurrentSession(); // Function from Script 9
                    else console.error("setupBaseEventListeners: renderCurrentSession function not found (Script 9?).");
                    workoutForm.reset();
                    const moodGood = document.getElementById('mood-good'); if (moodGood) moodGood.checked = true;
                    if (exerciseTypeSelect) exerciseTypeSelect.dispatchEvent(new Event('change')); // Reset fields visibility
                    if (typeof updateMascot === 'function') updateMascot(`La til ${data.name}! Fortsett sånn!`); // Function from Script 8
                    if (completeWorkoutButton) completeWorkoutButton.disabled = false;
                } else {
                    console.error("adjustXPForMood function not found!");
                    alert("Feil ved beregning av XP.");
                }
            }
        });
    }
    else { console.error("Workout Form element NOT FOUND!"); }

    // --- Complete Workout Button (Script 9) ---
    if (completeWorkoutButton) {
        completeWorkoutButton.addEventListener('click', () => {
            if(typeof completeWorkout === 'function') completeWorkout(); // Function from Script 9
            else console.error("setupBaseEventListeners: completeWorkout function not found (Script 9?).");
        });
    }
    else { console.error("Complete Workout button element NOT FOUND!"); }

    // --- User List Snoop Button (Event Delegation - Script 9) ---
    if (userListDisplay) {
        userListDisplay.addEventListener('click', (e) => {
            if (e.target.classList.contains('snoop-button')) {
                if (typeof playButtonClickSound === 'function') playButtonClickSound();
                const targetUsername = e.target.dataset.username;
                if (targetUsername) {
                    if (typeof showSnoopedLog === 'function') showSnoopedLog(targetUsername); // Function from Script 9
                    else console.error("setupBaseEventListeners: showSnoopedLog function not found (Script 9?).");

                    // Mark target as snooped upon in Firebase
                    if (firebaseInitialized && usersRef && users[targetUsername]) {
                        usersRef.child(targetUsername).update({ snooped: true })
                            .then(() => console.log(`Marked ${targetUsername} as snooped upon.`))
                            .catch(error => console.error(`Failed to mark ${targetUsername} as snooped:`, error));
                        // Increment snooper's count
                        if (currentUser && users[currentUser]?.stats) {
                            usersRef.child(currentUser).child('stats/timesSnooped').set(firebase.database.ServerValue.increment(1))
                                .then(() => {
                                    console.log(`Incremented timesSnooped for ${currentUser}.`);
                                    if (users[currentUser]?.stats) { // Update local count after successful Firebase update
                                        users[currentUser].stats.timesSnooped = (users[currentUser].stats.timesSnooped || 0) + 1;
                                        if(typeof checkAchievements === 'function') checkAchievements(currentUser); // Check achievements (Script 9)
                                    }
                                }).catch(error => console.error(`Failed to increment timesSnooped:`, error));
                        }
                    } else { console.warn("Snoop: Firebase not ready or target missing."); }
                }
            }
        });
    }
    else { console.error("User List Display element NOT FOUND for snoop listener!"); }

    // --- Snoop Modal Close Button (Script 8) ---
    if (closeSnoopModalButton) {
        closeSnoopModalButton.addEventListener('click', () => {
            if (typeof playButtonClickSound === 'function') playButtonClickSound();
            if (snoopModal) snoopModal.classList.remove('show');
        });
    }
    else { console.error("Close Snoop Modal button element NOT FOUND!"); }
    // --- Snoop Modal Background Click Close (Script 8) ---
     if (snoopModal) {
         snoopModal.addEventListener('click', (e) => {
             if (e.target === snoopModal) {
                 if (typeof playButtonClickSound === 'function') playButtonClickSound();
                 snoopModal.classList.remove('show');
             }
         });
     }
     else { console.error("Snoop Modal element NOT FOUND for background click listener!"); }


    // --- Admin Panel Buttons (Script 1) ---
    if (adminGiveXpButton) { adminGiveXpButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof adminAdjustXp === 'function') adminAdjustXp(); else console.error("adminAdjustXp function not found (Script 1?)."); }); }
    if (adminAddUserButton) { adminAddUserButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof adminAddNewUser === 'function') adminAddNewUser(); else console.error("adminAddNewUser function not found (Script 1?)."); }); }
    if (adminExtrasButton) { adminExtrasButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof setActiveView === 'function') setActiveView('admin'); }); }
    if (adminResetUserButton) { adminResetUserButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof adminResetUser === 'function') adminResetUser(); else console.error("adminResetUser function not found (Script 1?)."); }); }
    if (adminSaveAchievementsButton) { adminSaveAchievementsButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof adminSaveChanges === 'function') adminSaveChanges(); else console.error("adminSaveChanges function not found (Script 1?)."); }); }
    if (adminDeleteUserButton) { adminDeleteUserButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof adminDeleteUser === 'function') adminDeleteUser(); else console.error("adminDeleteUser function not found (Script 1?)."); }); }
    if (adminUserSelect) { adminUserSelect.addEventListener('change', () => { if (typeof adminPopulateAchievements === 'function') adminPopulateAchievements(); else console.error("adminPopulateAchievements function not found (Script 1?)."); }); }


    // --- Data Management Buttons (Script 9) ---
    if (saveDataButton) { saveDataButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (!firebaseInitialized) { if(typeof displayDataActionMessage === 'function') displayDataActionMessage("Firebase ikke tilkoblet!", false); } else { if(typeof displayDataActionMessage === 'function') displayDataActionMessage("Data lagres automatisk til Firebase!", true); } }); }
    if (exportDataButton) { exportDataButton.addEventListener('click', () => { if(typeof exportUserData === 'function') exportUserData(); else console.error("exportUserData function not found (Script 9?)."); }); } else { console.error("Export Data button element NOT FOUND!"); }
    if (importDataButton && importFileInput) { importDataButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); importFileInput.click(); }); importFileInput.addEventListener('change', (e) => { if(typeof handleDataImport === 'function') handleDataImport(e); else console.error("handleDataImport function not found (Script 9?)."); }); }
    else { console.error("Import Data button or File Input element NOT FOUND!"); }

    // --- Extras Tab Buttons (Script 8) ---
    if (retroModeButton) { retroModeButton.addEventListener('click', () => { if(typeof initializeAudio === 'function') initializeAudio().then(() => { retroSoundEnabled = !retroSoundEnabled; retroModeButton.textContent = `Retro Mode Lyd (${retroSoundEnabled ? 'På' : 'Av'})`; if(typeof updateMascot === 'function') updateMascot(retroSoundEnabled ? "8-bit lyd aktivert! Beep boop!" : "Moderne lydmodus. Smooth."); if(typeof playButtonClickSound === 'function') playButtonClickSound(); }); }); }
    else { console.error("Retro Mode button element NOT FOUND!"); }

    if (motivationButton) { motivationButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if (typeof motivationMessages !== 'undefined' && motivationMessages.length > 0) { const randomIndex = Math.floor(Math.random() * motivationMessages.length); const randomMessage = motivationMessages[randomIndex]; if(typeof updateMascot === 'function') updateMascot(randomMessage); } else { if(typeof updateMascot === 'function') updateMascot("Fant ingen motivasjon... Prøv igjen?"); } }); }
    else { console.error("Motivation button element NOT FOUND!"); }

    if (checkStatButton) { checkStatButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); if(typeof renderScoreboard === 'function') renderScoreboard(); if(typeof setActiveView === 'function') setActiveView('scoreboard'); }); }

    // --- Nikko's "Buy XP" Button (Script 8) ---
    if (nikkoBuyXpButton) { nikkoBuyXpButton.addEventListener('click', () => { if (typeof playButtonClickSound === 'function') playButtonClickSound(); const gotchaMessage = "Pay-to-win? Ikke her! 😉 Gotcha, Nikko!"; if(typeof showNotification === 'function') showNotification(gotchaMessage); if(typeof updateMascot === 'function') updateMascot(gotchaMessage); }); }

    // --- Chat Form Listener (Script 3) ---
     if (chatForm) { chatForm.addEventListener('submit', (e) => { e.preventDefault(); if (typeof sendChatMessage === 'function') { sendChatMessage(); } else { console.error("sendChatMessage function not found (Script 3?)."); alert("Chat-funksjonen er ikke tilgjengelig."); } }); }
     else { console.error("Chat Form element NOT FOUND!"); }

    // --- Log Entry Delete Button (Event Delegation - Script 9) ---
    if (logEntriesContainer) {
        logEntriesContainer.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-log-button');
            if (deleteButton) {
                if (typeof playButtonClickSound === 'function') playButtonClickSound();
                const entryId = deleteButton.dataset.entryId;
                const entryIdNum = parseInt(entryId, 10);
                if (!isNaN(entryIdNum)) {
                     if(typeof handleDeleteLogEntryClick === 'function') handleDeleteLogEntryClick(entryIdNum); // Function from Script 9
                     else console.error("setupBaseEventListeners: handleDeleteLogEntryClick function not found (Script 9?).");
                } else { console.error("Invalid entryId found on delete button:", entryId); }
            }
        });
    } else { console.error("Log Entries Container not found for delete listener setup!"); }


    console.log("Base event listeners setup complete.");
} // --- End of setupBaseEventListeners ---


// --- Run Initialization on DOM Load ---
/**
 * Initializes the application after the DOM is fully loaded.
 * Calls functions primarily from Script 8 and Script 10.
 */
function initializeApp() {
    console.log("Initializing App (v3.13 - Split Scripts)...");
    if(typeof initializeDOMElements === 'function') initializeDOMElements(); // Func from Script 8
    else { console.error("initializeApp: initializeDOMElements function not found (Script 8?)."); return; }

    if (demoModeIndicator) demoModeIndicator.textContent = "Live Mode - Initialiserer...";

    if(typeof initializeFirebaseConnection === 'function') initializeFirebaseConnection(); // Func from Script 8
    else { console.error("initializeApp: initializeFirebaseConnection function not found (Script 8?)."); return; }

    if(typeof displayDailyTip === 'function') displayDailyTip(); // Func from Script 8
    else console.warn("initializeApp: displayDailyTip function not found (Script 8?).");

    if(typeof updateWeeklyFeatures === 'function') updateWeeklyFeatures(); // Func from Script 8
    else console.warn("initializeApp: updateWeeklyFeatures function not found (Script 8?).");

    if(typeof setupBaseEventListeners === 'function') setupBaseEventListeners(); // Func from THIS script (Script 10)
    else { console.error("initializeApp: setupBaseEventListeners function not found (Script 10?)."); return; }

    const savedTheme = localStorage.getItem('fitnessAppTheme') || 'klinkekule';
    if(typeof setTheme === 'function') setTheme(savedTheme); // Func from Script 8
    else console.warn("initializeApp: setTheme function not found (Script 8?).");

    if(typeof setActiveView === 'function') setActiveView('login'); // Func from Script 8
    else console.warn("initializeApp: setActiveView function not found (Script 8?).");

    console.log("App initialization sequence complete.");
}

// Global flag to prevent multiple initializations
if (typeof window.appInitialized === 'undefined') {
     window.appInitialized = true;
     document.addEventListener('DOMContentLoaded', initializeApp);
} else {
     console.warn("Initialization script (Script 10) seems to be loaded more than once or app already initialized.");
}

// --- END OF SCRIPT 10 (DEL 3/3) ---
