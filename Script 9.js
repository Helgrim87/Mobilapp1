// === Script 9: Core Logic - Logging, Display, Data Management ===
// DEL 2 av 3 (Erstatter deler av Script 2.js)
// Inneholder: Funksjoner for treningslogging, logg/liste/scoreboard-visning,
// achievement-håndtering, og dataeksport/-import.
// AVHENGIGHETER: Globale variabler (currentUser, users etc.) og hjelpefunksjoner
// (f.eks. playSound, getLevel, setActiveView) definert i Script 8.
// Funksjoner fra Script 1 (Admin), Script 3 (Chat), Script 4 (Log Helpers),
// Script 5 (Charts), Script 6 (Comments), Script 7 (Discord) kalles herfra.

console.log("Script 9.js (DEL 2/3) loaded: Logging, Display, Data Management functions.");

// --- Workout Logging --- (Includes Anti-Cheat)

/**
 * Renders the list of activities added during the current workout session.
 * ** Updated to display steps. **
 * Assumes 'currentWorkout' array and 'currentSessionList' DOM element are available.
 */
function renderCurrentSession() {
     if (!currentSessionList) { console.warn("renderCurrentSession: currentSessionList element not found."); return; }
    if (currentWorkout.length === 0) {
        currentSessionList.innerHTML = '<li class="italic">Ingen aktivitet lagt til enda...</li>';
        if (completeWorkoutButton) completeWorkoutButton.disabled = true;
        return;
    }
    currentSessionList.innerHTML = currentWorkout.map(item => {
        let details = '';
        if (item.type === 'Gåtur') { details = `${item.km} km`; }
        else if (item.type === 'Skritt') { details = `${item.steps.toLocaleString('no-NO')} skritt`; } // Display steps
        else { details = `${item.kilos}kg x ${item.reps} reps x ${item.sets} sett`; }
        const moodEmojis = { great: '😃', good: '😊', ok: '😐', meh: '😕', bad: '😩' };
        const moodEmoji = moodEmojis[item.mood] || '';
        return `<li class="text-sm">${item.name} (${details}) ${moodEmoji} - ${item.xp} XP ${item.comment ? `<i class="opacity-70">(${item.comment})</i>` : ''}</li>`;
    }).join('');
    if (completeWorkoutButton) completeWorkoutButton.disabled = false;
}

/**
 * Handles the completion of a workout session.
 * ** Adds entryId and uses the NEW getLevelFromTotalXP function. **
 * ** Adds totalSteps calculation and saving. **
 * ** Calls getRandomComment and sendToDiscord. **
 * Assumes global state (currentUser, users, currentWorkout) and DOM elements are available.
 * Assumes helper functions (playSounds, Level/XP calcs, checkAchievements, updateUI, etc.) are defined elsewhere (Script 8, Script Level names).
 * Assumes Discord/Comment functions (sendToDiscord, getRandomComment) are defined elsewhere (Script 6, Script 7).
 */
function completeWorkout() {
    if (currentWorkout.length === 0 || !currentUser || !users[currentUser]) {
        console.warn("Complete workout called but prerequisites not met.");
        return;
    }
    if (!firebaseInitialized || !usersRef) {
        alert("Kan ikke lagre økt, ingen Firebase-tilkobling.");
        return;
    }
    // Check for required helper functions from other scripts
    const canSendDiscord = typeof sendToDiscord === 'function';
    const canGetComment = typeof getRandomComment === 'function';
    if (typeof playButtonClickSound !== 'function' || typeof getLevelFromTotalXP !== 'function' || typeof checkAchievements !== 'function' || typeof playXPSound !== 'function' || typeof triggerLevelUpAnimation !== 'function' || typeof playLevelUpSound !== 'function' || typeof updateMascot !== 'function' || typeof setActiveView !== 'function' || typeof updateUI !== 'function' || typeof renderLog !== 'function' || typeof renderActivityFeed !== 'function') {
         console.error("completeWorkout: Missing required helper functions!");
         alert("En intern feil oppstod (manglende hjelpefunksjoner).");
         return;
    }

    playButtonClickSound();
    console.log(`Completing workout for ${currentUser}. Activities: ${currentWorkout.length}`);
    const userData = users[currentUser];
    const userDataRef = usersRef.child(currentUser);
    const sessionXP = currentWorkout.reduce((sum, ex) => sum + (ex.xp || 0), 0);
    const sessionVol = currentWorkout.reduce((sum, ex) => sum + (ex.type !== 'Gåtur' && ex.type !== 'Skritt' ? ((ex.kilos || 0) * (ex.reps || 0) * (ex.sets || 0)) : 0), 0);
    const sessionKm = currentWorkout.reduce((sum, ex) => sum + (ex.type === 'Gåtur' ? (ex.km || 0) : 0), 0);
    const sessionSteps = currentWorkout.reduce((sum, ex) => sum + (ex.type === 'Skritt' ? (ex.steps || 0) : 0), 0);
    const sessionMood = currentWorkout.length > 0 ? currentWorkout[currentWorkout.length - 1].mood : 'good';
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const preciseTimestamp = now.getTime(); // Use timestamp as entryId

    let streak = userData.streak || 0;
    let lastDate = userData.lastWorkoutDate;
    let streakBonusMultiplier = 1.0;
    let streakBonusText = null;
    if (lastDate && lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) { streak++; } else { streak = 1; }
    } else if (!lastDate) { streak = 1; }
    if (streak > 1) {
        streakBonusMultiplier = Math.min(1 + (streak - 1) * 0.1, 1.5);
        streakBonusText = `${((streakBonusMultiplier - 1) * 100).toFixed(0)}% streak bonus!`;
    }
    const finalSessionXP = Math.round(sessionXP * streakBonusMultiplier);

    const entry = {
        entryId: preciseTimestamp,
        date: now.toLocaleString('no-NO', { dateStyle: 'short', timeStyle: 'short' }),
        isoDate: today,
        exercises: [...currentWorkout],
        totalXP: finalSessionXP,
        baseXP: sessionXP,
        totalVolume: sessionVol,
        totalKm: sessionKm,
        totalSteps: sessionSteps,
        mood: sessionMood,
        streakBonus: streakBonusText,
        streakDays: streak
    };

    if (!Array.isArray(userData.log)) userData.log = [];
    userData.log.unshift(entry);
    const previousLevel = userData.level;
    userData.xp = (userData.xp || 0) + finalSessionXP;
    userData.lastWorkoutDate = today;
    userData.streak = streak;
    if (!userData.stats) userData.stats = { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: new Set(), timesSnooped: 0, lastMood: null };
    if (typeof userData.stats.totalSteps !== 'number') userData.stats.totalSteps = 0;
    userData.stats.totalWorkouts = (userData.stats.totalWorkouts || 0) + 1;
    userData.stats.totalKm = (userData.stats.totalKm || 0) + sessionKm;
    userData.stats.totalVolume = (userData.stats.totalVolume || 0) + sessionVol;
    userData.stats.totalSteps += sessionSteps;
    userData.stats.lastMood = sessionMood;
    userData.level = getLevelFromTotalXP(userData.xp); // Function from Script Level names

    checkAchievements(currentUser); // Check achievements (defined later in this script)

    // Prepare data for saving (convert Set to Array)
    const userDataToSave = JSON.parse(JSON.stringify(userData));
    if (userDataToSave.stats?.themesTried instanceof Set) { userDataToSave.stats.themesTried = Array.from(userDataToSave.stats.themesTried); }
    else if (!Array.isArray(userDataToSave.stats?.themesTried)) { userDataToSave.stats.themesTried = []; }
    if (!Array.isArray(userDataToSave.log)) userDataToSave.log = [];
    if (!Array.isArray(userDataToSave.achievements)) userDataToSave.achievements = [];

    // Save to Firebase
    userDataRef.set(userDataToSave)
        .then(() => {
            console.log(`User data for ${currentUser} saved to RTDB after workout.`);
            playXPSound();
            const levelUp = userData.level > previousLevel;
            if (levelUp) {
                triggerLevelUpAnimation(userData.level); // Function from Script 8
                playLevelUpSound(); // Function from Script 8
                updateMascot(`LEVEL UP, ${currentUser}! Du nådde nivå ${userData.level}! 🎉`); // Function from Script 8
            } else {
                updateMascot(`Økt fullført! +${finalSessionXP.toLocaleString('no-NO')} XP! ${streak > 1 ? `Streak: ${streak} dager!` : ''} Bra jobba! 💪`); // Function from Script 8
            }

            // --- Discord Notification Logic ---
            if (canSendDiscord) {
                let activityTypeForComment = 'Annet';
                let firstExerciseDetails = 'en økt';
                if (entry.exercises.length > 0) {
                    const firstEx = entry.exercises[0];
                    activityTypeForComment = firstEx.type;
                    if (firstEx.type === 'Gåtur') { firstExerciseDetails = `${firstEx.km} km gåtur`; activityTypeForComment = 'Gåtur'; }
                    else if (firstEx.type === 'Skritt') { firstExerciseDetails = `${(firstEx.steps || 0).toLocaleString('no-NO')} skritt`; activityTypeForComment = 'Skritt'; }
                    else if (firstEx.type !== 'Annet') { firstExerciseDetails = `${firstEx.name} (${firstEx.kilos}kg x ${firstEx.reps}r x ${firstEx.sets}s)`; activityTypeForComment = 'Styrke'; }
                    else { firstExerciseDetails = `${firstEx.name}`; activityTypeForComment = 'Annet'; }
                }

                let randomComment = "Godt jobbet!";
                if (canGetComment) {
                    try { randomComment = getRandomComment(currentUser, activityTypeForComment); } // Function from Script 6
                    catch (e) { console.error("Error getting random comment:", e); }
                } else { console.warn("completeWorkout: getRandomComment function not found (Script 6?)."); }

                let discordMessage = `**${currentUser}** fullførte ${firstExerciseDetails} (+${finalSessionXP.toLocaleString('no-NO')} XP)`;
                if(entry.streakDays > 1) discordMessage += `, _Streak: ${entry.streakDays} dager!_`;
                if(levelUp) discordMessage += `\n**LEVEL UP!** 🔥 Nådde nivå ${userData.level}!`;
                discordMessage += `\n> ${randomComment}`;

                sendToDiscord(discordMessage).catch(e => console.error("Async Discord send error:", e)); // Function from Script 7
            } else { console.warn("completeWorkout: sendToDiscord function not found (Script 7?)."); }
            // --- End Discord Notification Logic ---

            currentWorkout = [];
            renderCurrentSession(); // Update session list display
            updateUI(); // Update profile card (Script 8)
            renderLog(); // Update log display (defined below)
            renderActivityFeed(); // Update feed (Script 8)
            setActiveView('profile'); // Change view (Script 8)
        })
        .catch(error => {
            console.error(`Failed to save user data for ${currentUser}:`, error);
            alert("Feil ved lagring av økt til Firebase! Data er kanskje ikke lagret.");
        });
}


// --- Log Rendering & Deletion ---

/**
 * Renders the user's workout log entries.
 * ** Adds Delete button for entries within 48 hours. **
 * ** Displays steps if logged. **
 * Assumes 'logEntriesContainer', 'currentUser', 'users' are available.
 * Assumes 'isEditable' function is available (Script 4).
 */
function renderLog() {
    if (!logEntriesContainer) { console.error("renderLog: Log container not found."); return; }
    if (!currentUser || !users[currentUser] || !Array.isArray(users[currentUser].log) || users[currentUser].log.length === 0) {
        logEntriesContainer.innerHTML = '<p class="italic">Ingen loggførte økter enda. Gå til "Logg Økt" for å starte!</p>';
        return;
    }
    const isEditableAvailable = typeof isEditable === 'function';
    if (!isEditableAvailable) { console.warn("renderLog: isEditable function (from Script 4) not found! Delete buttons will not be shown."); }

    const log = users[currentUser].log;
    console.log(`Rendering log for ${currentUser}. Entries: ${log.length}`);
    const sortedLog = [...log].sort((a, b) => (b.entryId || 0) - (a.entryId || 0)); // Sort by entryId (timestamp) descending

    logEntriesContainer.innerHTML = sortedLog.map(entry => {
        const exercisesHtml = entry.exercises.map(ex => {
            let details = '';
            if (ex.type === 'Gåtur') { details = `${ex.km} km`; }
            else if (ex.type === 'Skritt') { details = `${(ex.steps || 0).toLocaleString('no-NO')} skritt`; }
            else { details = `${ex.kilos || 0}kg x ${ex.reps || 0}r x ${ex.sets || 0}s`; }
             const moodEmojis = { great: '😃', good: '😊', ok: '😐', meh: '😕', bad: '😩' };
             const moodEmoji = moodEmojis[ex.mood] || '';
            return `<li class="ml-4 text-sm">${ex.name} (${details}) ${moodEmoji} - ${ex.xp} XP ${ex.comment ? `<i class="opacity-70">(${ex.comment})</i>` : ''}</li>`;
        }).join('');

        const entryDate = entry.date || (entry.isoDate ? new Date(entry.isoDate).toLocaleDateString('no-NO') : 'Ukjent dato');
        const streakInfo = entry.streakDays ? `(Dag ${entry.streakDays} streak)` : '';
        const bonusInfo = entry.streakBonus ? `<span class="text-xs text-yellow-400 ml-1">${entry.streakBonus}</span>` : '';
        const editable = isEditableAvailable && isEditable(entry); // isEditable from Script 4
        const deleteButtonHtml = editable && entry.entryId ?
            `<button class="button-base button-secondary text-xs py-0 px-1 ml-2 delete-log-button border-red-500 text-red-300 hover:bg-red-700 hover:text-white" data-entry-id="${entry.entryId}" title="Slett denne loggføringen (innen 48t)">Slett</button>`
             : '';

        return `
            <div class="border-b border-card pb-3 mb-3">
                <div class="flex justify-between items-start"> <p class="font-semibold">
                        ${entryDate} - Total XP: ${entry.totalXP.toLocaleString('no-NO')}
                        ${streakInfo} ${bonusInfo}
                         ${entry.mood ? `<span class="ml-2 text-xs italic opacity-80">(Økt føltes: ${entry.mood})</span>` : ''}
                    </p>
                    ${deleteButtonHtml} </div>
                <ul class="list-disc list-inside mt-1 space-y-1">
                    ${exercisesHtml}
                </ul>
            </div>
        `;
    }).join('');
}

/**
 * Handles the click event for deleting a log entry.
 * Confirms with user, calls helper function, saves to Firebase.
 * Assumes 'deleteLogEntry' function is available (Script 4).
 */
function handleDeleteLogEntryClick(entryId) {
    const entryIdNum = Number(entryId);
    if (isNaN(entryIdNum)) { console.error("handleDeleteLogEntryClick: Invalid entryId:", entryId); return; }
    if (!currentUser || !users[currentUser] || !Array.isArray(users[currentUser].log)) { console.error("handleDeleteLogEntryClick: No user or log found."); return; }
    if (typeof deleteLogEntry !== 'function') { console.error("handleDeleteLogEntryClick: deleteLogEntry function (from Script 4) not found."); alert("Slettefunksjon mangler."); return; }
    if (!firebaseInitialized || !usersRef) { alert("Kan ikke slette, Firebase ikke tilkoblet."); return; }

    const entryToDelete = users[currentUser].log.find(entry => entry.entryId === entryIdNum);
    const confirmMessage = entryToDelete ? `Sikker på at du vil slette loggføring fra ${entryToDelete.date || 'denne datoen'}?\nDette kan IKKE angres.` : "Sikker på at du vil slette denne loggføringen?\nDette kan IKKE angres.";

    if (confirm(confirmMessage)) {
        console.log(`Attempting to delete log entry ID: ${entryIdNum}`);
        const currentLog = users[currentUser].log;
        const updatedLog = deleteLogEntry(entryIdNum, currentLog); // Call helper from Script 4

        if (updatedLog !== null) {
            // TODO: Implement recalculation of XP, level, stats if needed in future.
            console.warn("Log entry deleted, but user total XP/stats were NOT recalculated.");
            users[currentUser].log = updatedLog; // Update local log

            const userDataToSave = JSON.parse(JSON.stringify(users[currentUser]));
            if (userDataToSave.stats?.themesTried instanceof Set) userDataToSave.stats.themesTried = Array.from(userDataToSave.stats.themesTried);
            else if (!Array.isArray(userDataToSave.stats?.themesTried)) userDataToSave.stats.themesTried = [];
            if (!Array.isArray(userDataToSave.log)) userDataToSave.log = [];
            if (!Array.isArray(userDataToSave.achievements)) userDataToSave.achievements = [];

            usersRef.child(currentUser).set(userDataToSave)
                .then(() => {
                    console.log(`Log entry ${entryIdNum} deleted successfully for ${currentUser}.`);
                    showNotification("Loggføring slettet!"); // Function from Script 8
                    renderLog(); // Re-render log view
                    renderActivityFeed(); // Re-render feed (Script 8)
                    // updateUI(); // Optionally update profile card if stats were recalculated
                })
                .catch(error => {
                    console.error(`Failed to save user data after deleting log entry ${entryIdNum}:`, error);
                    alert("Kunne ikke lagre endringer etter sletting.");
                    users[currentUser].log = currentLog; // Revert local change on error
                    renderLog();
                });
        } else {
            console.error(`Failed to delete log entry ${entryIdNum} locally (not found?).`);
            alert("Kunne ikke slette loggføringen (intern feil).");
        }
    } else {
        console.log("Log entry deletion cancelled by user.");
    }
}


// --- User List & Snoop ---

/**
 * Renders the list of all users, sorted by XP, with a snoop button if applicable.
 * Assumes 'userListDisplay', 'currentUser', 'users' are available.
 * Assumes 'levelNames', 'getLevelFromTotalXP' are available (Script Level names).
 */
function renderUserList() {
     if (!userListDisplay) { console.error("renderUserList: User list display element not found."); return; }
    console.log("Rendering user list...");
    if (!users || Object.keys(users).length === 0) { userListDisplay.innerHTML = '<li class="italic">Laster brukerliste...</li>'; return; }
    if (typeof levelNames === 'undefined' || typeof getLevelFromTotalXP !== 'function') { console.error("renderUserList: Missing levelNames or getLevelFromTotalXP."); userListDisplay.innerHTML = '<li class="italic">Feil ved lasting av brukerliste.</li>'; return; }

    const sortedUsernames = Object.keys(users).sort((a, b) => (users[b].xp || 0) - (users[a].xp || 0));
    userListDisplay.innerHTML = sortedUsernames.map(username => {
        const user = users[username];
        const level = getLevelFromTotalXP(user.xp || 0);
        const levelName = levelNames[level] || "Ukjent";
        const canSnoop = currentUser && currentUser !== username;
        return `
            <li class="flex justify-between items-center py-2 border-b border-card hover:bg-white hover:bg-opacity-5 transition-colors duration-150">
                <span class="flex-grow">
                    <span class="font-semibold text-accent">${username}</span>
                    <span class="text-sm"> - Nivå ${level} (${levelName}) - ${user.xp || 0} XP</span>
                </span>
                ${canSnoop ? `<button class="button-base button-secondary text-xs py-1 px-2 snoop-button ml-2 flex-shrink-0" data-username="${username}">Snok</button>` : ''}
            </li>
        `;
    }).join('');
}

/**
 * Shows the snoop modal with details about the target user.
 * Assumes 'snoopModal' related DOM elements and 'users' are available.
 * Assumes 'levelNames', 'getLevelFromTotalXP', 'achievementList' are available (Script Level names).
 */
function showSnoopedLog(targetUsername) {
     if (!snoopModal || !snoopModalTitle || !snoopModalLog || !users || !users[targetUsername]) { console.error("showSnoopedLog: Missing elements or target user data."); return; }
     if (typeof getLevelFromTotalXP !== 'function' || typeof levelNames === 'undefined' || typeof achievementList === 'undefined') { console.error("showSnoopedLog: Missing required functions or data."); return; }

    const targetUser = users[targetUsername];
    const snoopUserInfo = document.getElementById('snoop-user-info');
    const snoopAchievements = document.getElementById('snoop-achievements');
    const snoop7dVolume = document.getElementById('snoop-7d-volume');
    const snoop7dKm = document.getElementById('snoop-7d-km');
    const snoop7dXp = document.getElementById('snoop-7d-xp');
    const snoopLevel = document.getElementById('snoop-level');
    const snoopXp = document.getElementById('snoop-xp');
    const snoopLastLogin = document.getElementById('snoop-last-login');
    const snoopLastMood = document.getElementById('snoop-last-mood');

    snoopModalTitle.textContent = `Snoker på: ${targetUsername}`;
    if (snoopUserInfo) {
        const level = getLevelFromTotalXP(targetUser.xp || 0);
        if (snoopLevel) snoopLevel.textContent = `${level} (${levelNames[level] || 'Ukjent'})`;
        if (snoopXp) snoopXp.textContent = (targetUser.xp || 0).toLocaleString('no-NO');
        if (snoopLastLogin) snoopLastLogin.textContent = targetUser.lastLogin ? new Date(targetUser.lastLogin).toLocaleString('no-NO') : 'Aldri';
        if (snoopLastMood) snoopLastMood.textContent = targetUser.stats?.lastMood || 'Ingen data';
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        let volume7d = 0, km7d = 0, xp7d = 0;
        if (Array.isArray(targetUser.log)) {
            targetUser.log.forEach(entry => {
                if (entry.isoDate && entry.isoDate >= sevenDaysAgo) {
                    volume7d += entry.totalVolume || 0; xp7d += entry.totalXP || 0;
                    if (Array.isArray(entry.exercises)) { entry.exercises.forEach(ex => { if (ex.type === 'Gåtur') km7d += ex.km || 0; }); }
                }
            });
        }
        if (snoop7dVolume) snoop7dVolume.textContent = volume7d.toLocaleString('no-NO');
        if (snoop7dKm) snoop7dKm.textContent = km7d.toFixed(1);
        if (snoop7dXp) snoop7dXp.textContent = xp7d.toLocaleString('no-NO');
    } else { console.warn("showSnoopedLog: snoop-user-info element not found."); }

    if (snoopAchievements) {
        const userAchievements = targetUser.achievements || [];
        if (typeof achievementList !== 'undefined' && achievementList.length > 0) {
            snoopAchievements.innerHTML = achievementList.map(ach => { const unlocked = userAchievements.includes(ach.id); return `<li class="${unlocked ? 'achievement-unlocked font-semibold' : 'achievement-locked opacity-60'}"> ${unlocked ? '✔️' : '🔒'} ${ach.name}</li>`; }).join('');
        } else { snoopAchievements.innerHTML = '<li class="italic">Ingen achievements definert.</li>'; }
    } else { console.warn("showSnoopedLog: snoop-achievements element not found."); }

    snoopModalLog.innerHTML = '<p class="italic">Laster logg...</p>';
    if (Array.isArray(targetUser.log) && targetUser.log.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const recentLogs = targetUser.log.filter(entry => entry.isoDate && entry.isoDate >= sevenDaysAgo).sort((a, b) => (b.entryId || 0) - (a.entryId || 0)); // Sort by timestamp
        if (recentLogs.length > 0) {
            snoopModalLog.innerHTML = recentLogs.map(entry => {
                const exercisesHtml = entry.exercises.map(ex => { let details = ''; if (ex.type === 'Gåtur') { details = `${ex.km} km`; } else if (ex.type === 'Skritt') { details = `${(ex.steps||0).toLocaleString('no-NO')} skritt`; } else { details = `${ex.kilos || 0}kg x ${ex.reps || 0}r x ${ex.sets || 0}s`; } return `<li class="ml-4">${ex.name} (${details}) - ${ex.xp}XP</li>`; }).join('');
                const entryDate = entry.date || (entry.isoDate ? new Date(entry.isoDate).toLocaleDateString('no-NO') : 'Ukjent dato');
                return `<div class="mb-2 border-b border-card pb-1"><p><strong>${entryDate}</strong> (+${entry.totalXP} XP)</p><ul class="list-disc list-inside text-xs">${exercisesHtml}</ul></div>`;
            }).join('');
        } else { snoopModalLog.innerHTML = '<p class="italic">Ingen økter logget de siste 7 dagene.</p>'; }
    } else { snoopModalLog.innerHTML = '<p class="italic">Ingen loggførte økter.</p>'; }
    if (snoopModal) snoopModal.classList.add('show');
}

/**
 * Checks if the current user has been marked as 'snooped' upon login.
 * Assumes 'currentUser', 'users', 'firebaseInitialized', 'usersRef' are available.
 * Assumes 'showNotification' function is available (Script 8).
 */
function checkAndShowSnoopNotification() {
    if (!currentUser || !users[currentUser] || !firebaseInitialized || !usersRef) return;
    const userData = users[currentUser];
    if (userData && userData.snooped) {
        if (typeof showNotification === 'function') showNotification(`${currentUser}, noen snoket på profilen din mens du var borte! 👀`);
        else console.warn("checkAndShowSnoopNotification: showNotification function not found.");
        usersRef.child(currentUser).update({ snooped: false })
            .then(() => console.log(`Reset snooped flag for ${currentUser}.`))
            .catch(error => console.error(`Failed to reset snooped flag for ${currentUser}:`, error));
        userData.snooped = false; // Reset locally immediately
    } else if (!userData) { console.warn("checkAndShowSnoopNotification: userData missing for currentUser:", currentUser); }
}


// --- Scoreboard ---

/**
 * Renders the weekly XP and Steps scoreboards.
 * Assumes 'scoreboardList', 'scoreboardStepsList', 'users' are available.
 * Assumes 'getLevelFromTotalXP' function is available (Script Level names).
 */
function renderScoreboard() {
    if (!scoreboardList || !scoreboardStepsList) { console.error("renderScoreboard: Scoreboard list elements (XP or Steps) not found."); return; }
    console.log("Rendering scoreboards (XP and Steps)...");
    if (!users || Object.keys(users).length === 0) { scoreboardList.innerHTML = '<li class="italic">Laster XP...</li>'; scoreboardStepsList.innerHTML = '<li class="italic">Laster skritt...</li>'; return; }
    if (typeof getLevelFromTotalXP !== 'function') { console.error("renderScoreboard: Missing getLevelFromTotalXP function."); scoreboardList.innerHTML = '<li class="italic">Feil ved lasting.</li>'; scoreboardStepsList.innerHTML = '<li class="italic">Feil ved lasting.</li>'; return; }

    const now = new Date(); const dayOfWeek = now.getDay(); const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); const startOfWeek = new Date(now.setDate(diff)); startOfWeek.setHours(0, 0, 0, 0); const startOfWeekISO = startOfWeek.toISOString().split('T')[0];

    const weeklyStats = Object.entries(users).map(([username, userData]) => {
        let weeklyXP = 0; let weeklySteps = 0;
        if (Array.isArray(userData.log)) {
            userData.log.forEach(entry => {
                if (entry.isoDate && entry.isoDate >= startOfWeekISO) {
                    weeklyXP += entry.totalXP || 0;
                    if (Array.isArray(entry.exercises)) { entry.exercises.forEach(ex => { if (ex.type === 'Skritt') weeklySteps += ex.steps || 0; }); }
                     if (entry.totalSteps && !entry.exercises?.some(ex => ex.type === 'Skritt')) weeklySteps += entry.totalSteps; // Compatibility
                }
            });
        }
        const level = getLevelFromTotalXP(userData.xp || 0);
        return { username, weeklyXP, weeklySteps, level };
    });

    // Render XP Scoreboard
    const sortedByXP = [...weeklyStats].sort((a, b) => b.weeklyXP - a.weeklyXP);
    scoreboardList.innerHTML = sortedByXP.map((data, index) => `<li class="py-1"><span class="font-semibold">${index + 1}. ${data.username}</span> - ${data.weeklyXP.toLocaleString('no-NO')} XP denne uken (Nivå ${data.level})</li>`).join('');

    // Render Steps Scoreboard
    const sortedBySteps = [...weeklyStats].sort((a, b) => b.weeklySteps - a.weeklySteps);
    scoreboardStepsList.innerHTML = sortedBySteps.map((data, index) => `<li class="py-1"><span class="font-semibold">${index + 1}. ${data.username}</span> - ${data.weeklySteps.toLocaleString('no-NO')} skritt denne uken</li>`).join('');
    if (scoreboardStepsList.innerHTML.trim() === '') scoreboardStepsList.innerHTML = '<li class="italic">Ingen skritt logget denne uken.</li>';
}


// --- Achievements ---

/**
 * Checks if the user has unlocked any new achievements.
 * Assumes 'users', 'achievementList' are available.
 * Assumes 'triggerAchievementUnlockAnimation', 'playLevelUpSound', 'renderAchievements' are available (Script 8 & 9).
 * @param {string} username - The username to check.
 */
function checkAchievements(username) {
    if (!users[username] || typeof achievementList === 'undefined') return;
    const canTriggerPopup = typeof triggerAchievementUnlockAnimation === 'function';
    if (!canTriggerPopup) { console.warn("checkAchievements: triggerAchievementUnlockAnimation function not found."); }

    const user = users[username];
    if (!Array.isArray(user.achievements)) user.achievements = [];
    let changed = false; let newlyUnlocked = [];

    achievementList.forEach(ach => {
        if (!user.achievements.includes(ach.id)) {
            if (ach.criteria && typeof ach.criteria === 'function') {
                 try { if (ach.criteria(user)) { user.achievements.push(ach.id); newlyUnlocked.push(ach); changed = true; console.log(`${username} unlocked: ${ach.name}`); } }
                 catch (error) { console.error(`Error checking criteria for '${ach.id}' for ${username}:`, error); }
            }
        }
    });

    if (changed) {
        newlyUnlocked.forEach((ach, index) => { setTimeout(() => { if (canTriggerPopup) triggerAchievementUnlockAnimation(ach.name); else showNotification(`Achievement Låst Opp: ${ach.name}!`); if(typeof playLevelUpSound === 'function') playLevelUpSound(); }, index * 1000); });
        if (firebaseInitialized && usersRef) { usersRef.child(username).child('achievements').set(user.achievements).then(() => console.log(`Updated achievements for ${username}.`)).catch(error => console.error(`Failed to update achievements:`, error)); }
        if (username === currentUser && typeof renderAchievements === 'function') renderAchievements();
    }
}

/**
 * Renders the list of achievements for the currently logged-in user.
 * Assumes 'achievementsListContainer', 'currentUser', 'users', 'achievementList' are available.
 */
function renderAchievements() {
    if (!achievementsListContainer) { console.error("renderAchievements: Container not found."); return; }
    if (!currentUser || !users[currentUser]) { achievementsListContainer.innerHTML = '<p class="italic">Logg inn for å se achievements.</p>'; return; }
    const userAchievements = users[currentUser].achievements || [];
    console.log("Rendering achievements for:", currentUser, userAchievements);
    if (typeof achievementList === 'undefined' || achievementList.length === 0) { achievementsListContainer.innerHTML = '<p class="italic">Ingen achievements definert ennå.</p>'; return; }
    achievementsListContainer.innerHTML = achievementList.map(ach => {
        const unlocked = userAchievements.includes(ach.id);
        return ` <div class="py-2 border-b border-card ${unlocked ? 'achievement-unlocked' : 'achievement-locked opacity-60'} transition-opacity duration-300"> <span class="text-lg mr-2">${unlocked ? '✔️' : '🔒'}</span> <span> <strong class="${unlocked ? 'text-accent font-semibold' : 'font-medium'}">${ach.name}</strong> <p class="text-sm">${ach.description}</p> </span> </div> `;
    }).join('');
}


// --- Data Management (Export/Import Logic) ---

/**
 * Displays a temporary message related to data actions (export/import).
 * Assumes 'dataActionMessage' DOM element is available.
 */
function displayDataActionMessage(message, success = true) {
    if (!dataActionMessage) return;
    dataActionMessage.textContent = message;
    dataActionMessage.className = `text-xs italic mt-2 h-4 ${success ? 'text-green-500' : 'text-red-500'}`;
    setTimeout(() => { if (dataActionMessage) dataActionMessage.textContent = ''; }, 3000);
}
/**
 * Initiates the export of all user data to a JSON file.
 * Assumes 'users', 'currentUser', 'firebaseInitialized', 'usersRef' are available.
 * Assumes 'checkAchievements', 'playButtonClickSound', 'displayDataActionMessage' are available.
 */
function exportUserData() {
    playButtonClickSound();
    if (!users || Object.keys(users).length === 0) { displayDataActionMessage("Ingen data å eksportere.", false); return; }
    if (currentUser && users[currentUser]?.stats) {
        users[currentUser].stats.exportedData = true;
        checkAchievements(currentUser);
        if (firebaseInitialized && usersRef) { usersRef.child(currentUser).child('stats/exportedData').set(true).catch(err => console.error("Failed to update exportedData flag in RTDB", err)); }
    }
    try {
        const dataToExport = JSON.parse(JSON.stringify(users));
        Object.values(dataToExport).forEach(user => {
            if (user.stats?.themesTried instanceof Set) user.stats.themesTried = Array.from(user.stats.themesTried);
            else if (!Array.isArray(user.stats?.themesTried)) user.stats.themesTried = [];
            if (!Array.isArray(user.log)) user.log = [];
            if (!Array.isArray(user.achievements)) user.achievements = [];
        });
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `fit_g4fl_data_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        displayDataActionMessage("Data eksportert!", true);
    } catch (error) { console.error("Export error:", error); displayDataActionMessage("Eksportfeil!", false); alert(`Eksportfeil: ${error.message}`); }
}
/**
 * Handles the file selection for data import.
 * Assumes 'importFileInput', 'firebaseInitialized', 'usersRef', 'currentUser' are available.
 * Assumes 'getLevelFromTotalXP', 'displayDataActionMessage' are available.
 */
function handleDataImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!firebaseInitialized || !usersRef) { alert("Kan ikke importere, Firebase ikke tilkoblet."); if (importFileInput) importFileInput.value = ''; return; }
    if (!confirm("ADVARSEL: Dette vil OVERSKRIVE ALL eksisterende data i Firebase med innholdet i filen. Er du helt sikker?")) { if (importFileInput) importFileInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (typeof importedData !== 'object' || importedData === null) { throw new Error("Importert data er ikke et gyldig objekt."); }
            console.log("Validating and preparing imported data...");
            const dataToImport = JSON.parse(JSON.stringify(importedData));
            Object.entries(dataToImport).forEach(([username, user]) => {
                const defaultUserStructure = { xp: 0, level: 0, log: [], theme: 'klinkekule', lastWorkoutDate: null, streak: 0, snooped: false, lastLogin: null, achievements: [], stats: { totalWorkouts: 0, totalKm: 0, totalVolume: 0, totalSteps: 0, themesTried: [], timesSnooped: 0, lastMood: null, importedData: false, exportedData: false } };
                dataToImport[username] = { ...defaultUserStructure, ...user };
                dataToImport[username].stats = { ...defaultUserStructure.stats, ...(user.stats || {}) };
                if (!Array.isArray(dataToImport[username].stats.themesTried)) dataToImport[username].stats.themesTried = [];
                if (!Array.isArray(dataToImport[username].log)) dataToImport[username].log = [];
                if (!Array.isArray(dataToImport[username].achievements)) dataToImport[username].achievements = [];
                if (typeof dataToImport[username].stats.totalSteps !== 'number') dataToImport[username].stats.totalSteps = 0;
                dataToImport[username].level = getLevelFromTotalXP(dataToImport[username].xp || 0);
            });
            usersRef.set(dataToImport)
                .then(() => {
                    displayDataActionMessage("Data importert og overskrevet i Firebase!", true);
                    alert("Data importert! Appen vil nå bruke den nye dataen (kan kreve refresh eller ny innlogging).");
                    if (currentUser && dataToImport[currentUser]?.stats) { usersRef.child(currentUser).child('stats/importedData').set(true).catch(err => console.error("Failed to update importedData flag", err)); }
                })
                .catch(error => { console.error("Firebase import error:", error); displayDataActionMessage(`Importfeil (Firebase): ${error.message}`, false); alert(`Importfeil (Firebase): ${error.message}`); });
        } catch (error) { console.error("Import file parse/validation error:", error); displayDataActionMessage(`Importfeil (Fil/Data): ${error.message}`, false); alert(`Importfeil (Fil/Data): ${error.message}`); }
        finally { if (importFileInput) importFileInput.value = ''; }
    };
    reader.onerror = (e) => { console.error("File read error:", e); displayDataActionMessage("Fil-lesefeil.", false); alert("Kunne ikke lese filen."); if (importFileInput) importFileInput.value = ''; };
    reader.readAsText(file);
}

// --- END OF SCRIPT 9 (DEL 2/3) ---
