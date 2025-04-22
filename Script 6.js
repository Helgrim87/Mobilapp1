// === Script 6: Activity-Specific Comments with Dialects ===
// Contains arrays of motivational comments categorized by dialect and activity type.
// Includes a function to retrieve a random comment suitable for the user's dialect and activity.

console.log("Script 6.js (v3 - Dialects) loaded: Dialect-specific comments defined.");

// --- User Dialect Mapping ---
// Maps usernames to dialect groups. Add new users here.
const userDialects = {
    "Klinkekule": "vestland", // Vestland (med banano!)
    "Kennyball": "fredrikstad",
    "Nikko": "fredrikstad",
    "Dardna": "fredrikstad",
    "Helgrim": "tronder",
    "krrroppekatt": "tronder",
    "Beerbjorn": "tronder",
    "Skytebasen": "tronder",
    // Add other users here, defaulting to 'neutral' if not specified
};

// --- Activity Comments by Dialect ---
const activityComments = {
    // --- Vestland (Klinkekule) ---
    "vestland": {
        'Styrke': [
            "Da va'kje reint lett, men du klarte det!",
            "Skikkelig KRAFTKAR!",
            "Pump i lårene og armane no!",
            "Du e sterk som ein fjordhest!",
            "Godt jobba! No fortjene du ein banano!", // Banano!
            "Sykt bra innsats!",
            "Beist!"
        ],
        'Gåtur': [
            "Frisk luft i skallen!",
            "Godt å få rørt på skrotten!",
            "Ein fin tur i da fria!",
            "Kilometer i banken!",
            "Kanskje du såg ein hjort? Eller fekk ein banano?", // Banano!
            "Fint driv!"
        ],
        'Skritt': [
            "Du har gått langt, jo!",
            "Mange skritt, da e bra!",
            "Aktiv kar!",
            "Hald da gåande!",
            "Nesten ein banano for kvart tusen skritt!", // Banano!
            "Godt for helso!"
        ],
        'Annet': [
            "God innsats, ka enn du jore!",
            "All aktivitet telle!",
            "Kreativt!",
            "Bra jobba!",
            "Du fekk no svetta litt!"
        ],
        'default': [ // Fallback for Vestland
            "Heilt rått!", "Strålande!", "Imponerande!", "Godt jobba!", "Stå på!", "Du e god!", "Fortjent banano no!" // Banano!
        ]
    },
    // --- Fredrikstad (Kennyball, Nikko, Dardna) ---
    "fredrikstad": {
        'Styrke': [
            "Åssen går det mè arma'n etter detta?",
            "Du er råsterk, ass!",
            "Pump i jærne!",
            "Detta kjennes i morra!",
            "Bra jobba på senteret!",
            "Gønner på!",
            "Skikkelig økt!"
        ],
        'Gåtur': [
            "Deilig med en luftetur!",
            "Godt å komme sæ ut litt!",
            "Fin runde!",
            "Ble det langtur i dag?",
            "Bra tempo!",
            "Ut på tur, aldri sur!"
        ],
        'Skritt': [
            "Mange skritt i dag, bra!",
            "Du har vært aktiv!",
            "Hold koken!",
            "Gått mye?",
            "Bra for pumpa!"
        ],
        'Annet': [
            "God innsats!",
            "All bevegelse er bra!",
            "Kult!",
            "Bra du gjør noe!",
            "Stå på!"
        ],
        'default': [ // Fallback for Fredrikstad
            "Kjempebra!", "Rått!", "Stærkt!", "Godt jobba!", "Du er maskin!", "Fortsett sånn!"
        ]
    },
    // --- Trønder (Helgrim, krrroppekatt, Beerbjorn, Skytebasen) ---
    "tronder": {
        'Styrke': [
            "Det va tungt, ja!",
            "Du e itj nå latmannj, nei!",
            "Pump i musklan!",
            "Æ trur du vart sliten no!",
            "Steinbra jobba!",
            "Itj nå kjære mor her!",
            "Solid økt!"
        ],
        'Gåtur': [
            "Godt å få lufta sæ!",
            "Fin tur ut i det fri!",
            "Langkjøring eller kjapp tur?",
            "Bra for kropp og sjel!",
            "Traska på!",
            "Fint vær te å gå i?"
        ],
        'Skritt': [
            "Mange skritt, det e bra!",
            "Du e aktiv, ja!",
            "Fortsett med det!",
            "Gått langt i dag?",
            "Hålt dæ i gang!"
        ],
        'Annet': [
            "Godt jobba, uansett ka det va!",
            "Alt telle!",
            "Kreativt påfunn!",
            "Bra innsats!",
            "Fått opp pulsen!"
        ],
        'default': [ // Fallback for Trønder
            "Kanonbra!", "Helt rått!", "Imponeranes!", "Godt jobba!", "Du e sterk!", "Stå på!"
        ]
    },
    // --- Nøytral / Ukjent ---
    "neutral": {
        'Styrke': [
            "Musklene fikk kjørt seg!", "Sterk innsats!", "God økt!", "Du bygger styrke!", "Imponerende løfting!", "Bra jobba med vektene!"
        ],
        'Gåtur': [
            "Frisk luft gjør godt!", "Fin tur!", "Kilometer samlet!", "Godt for helsa!", "Bra tempo!", "Deilig å være ute!"
        ],
        'Skritt': [
            "Mange skritt i dag!", "Aktiv dag!", "Alle skritt teller!", "Godt å holde seg i bevegelse!", "Bra jobba med å samle skritt!"
        ],
        'Annet': [
            "God innsats!", "All aktivitet er bra!", "Bra jobba!", "Kreativt!", "Stå på!"
        ],
        'default': [ // Fallback for Nøytral og hvis alt annet feiler
            "Kjempebra jobba!", "Stå på videre!", "Imponerende!", "Du gir jernet!", "Awesome!", "Nailed it! 💪", "Fortsett den gode trenden!", "Fantastisk innsats!", "Godt levert!", "Inspirerende å se!", "Du er rå!", "For en innsats!", "Wow!", "Helt konge!", "Smashing!", "Superb!", "Strålende gjennomført!", "Heia deg!", "Solid!", "Respekt!", "Bravo!", "Sånn ja!", "Du ruler!", "Flammer! 🔥"
        ]
    }
};

/**
 * Selects and returns a random motivational comment suitable for the user's dialect and activity type.
 * @param {string} username - The username of the user who completed the activity.
 * @param {string} activityType - The type of activity (e.g., 'Styrke', 'Gåtur', 'Skritt').
 * @returns {string} A random comment relevant to the user and activity.
 */
function getRandomComment(username, activityType) {
    // Bestem dialekt basert på brukernavn, default til 'neutral'
    const dialect = userDialects[username] || 'neutral';
    let commentsPool = [];

    // 1. Prøv å finne kommentarer for spesifikk dialekt OG spesifikk aktivitetstype
    if (activityComments[dialect] && activityComments[dialect][activityType] && activityComments[dialect][activityType].length > 0) {
        commentsPool = activityComments[dialect][activityType];
        console.log(`getRandomComment: Found comments for dialect "${dialect}" and type "${activityType}".`);
    }
    // 2. Fallback: Prøv Nøytral dialekt for spesifikk aktivitetstype
    else if (activityComments['neutral'] && activityComments['neutral'][activityType] && activityComments['neutral'][activityType].length > 0) {
        commentsPool = activityComments['neutral'][activityType];
        console.warn(`getRandomComment: No specific comments for dialect "${dialect}" / type "${activityType}". Using "neutral" / type "${activityType}".`);
    }
    // 3. Fallback: Prøv spesifikk dialekt for 'Annet'/'default'
    else if (activityComments[dialect] && activityComments[dialect]['Annet'] && activityComments[dialect]['Annet'].length > 0) {
        commentsPool = activityComments[dialect]['Annet'];
         console.warn(`getRandomComment: No specific comments for dialect "${dialect}" / type "${activityType}" or neutral type. Using dialect "${dialect}" / type "Annet".`);
    } else if (activityComments[dialect] && activityComments[dialect]['default'] && activityComments[dialect]['default'].length > 0) {
        commentsPool = activityComments[dialect]['default'];
        console.warn(`getRandomComment: No specific comments for dialect "${dialect}" / type "${activityType}" or neutral type or dialect/Annet. Using dialect "${dialect}" / type "default".`);
    }
    // 4. Fallback: Bruk Nøytral 'Annet'/'default'
    else if (activityComments['neutral'] && activityComments['neutral']['Annet'] && activityComments['neutral']['Annet'].length > 0) {
        commentsPool = activityComments['neutral']['Annet'];
        console.warn(`getRandomComment: Using "neutral" / type "Annet".`);
    } else if (activityComments['neutral'] && activityComments['neutral']['default'] && activityComments['neutral']['default'].length > 0) {
        commentsPool = activityComments['neutral']['default'];
        console.warn(`getRandomComment: Using "neutral" / type "default".`);
    } else {
        // Absolutt siste utvei
        console.error("getRandomComment: No suitable comment pools found!");
        return "Godt jobbet!";
    }

    // Velg en tilfeldig kommentar fra den valgte poolen
    const randomIndex = Math.floor(Math.random() * commentsPool.length);
    return commentsPool[randomIndex];
}

// Example usage (for testing in console):
// console.log("Comment for Klinkekule (Styrke):", getRandomComment('Klinkekule', 'Styrke'));
// console.log("Comment for Kennyball (Gåtur):", getRandomComment('Kennyball', 'Gåtur'));
// console.log("Comment for Helgrim (Skritt):", getRandomComment('Helgrim', 'Skritt'));
// console.log("Comment for UkjentBruker (Styrke):", getRandomComment('UkjentBruker', 'Styrke')); // Should use neutral/styrke
// console.log("Comment for Klinkekule (Yoga):", getRandomComment('Klinkekule', 'Yoga')); // Should use vestland/Annet or vestland/default
