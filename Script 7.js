// === Script 7: Discord Integration ===
console.log("Script 7.js loaded: Discord functions defined.");

// *** DIN WEBHOOK URL ER LAGT INN HER ***
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1364278731371319509/E9W-CHCLpbuVSAP7OUDCpV8DZPdyaZVN2uYo0bf6TNmp7VGnnabsKNNov09AATavYjrj";

/**
 * Sender en melding til Discord webhook.
 * @param {string} message - Teksten som skal sendes.
 * @param {string} [username="Fit G4FL Bot"] - Navnet boten skal vises med i Discord.
 * @returns {Promise<void>}
 */
async function sendToDiscord(message, username = "Fit G4FL Bot") {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("DIN_DISCORD_WEBHOOK_URL")) { // Ekstra sjekk
        console.warn("Discord Webhook URL er ikke (gyldig) satt i Script 7.js. Kan ikke sende melding.");
        return;
    }
     if (!message || message.trim() === '') {
         console.warn("sendToDiscord: Tom melding ble forsøkt sendt.");
         return;
     }

    // Enkel Discord webhook payload
    const payload = {
        content: message.substring(0, 2000), // Discord har en grense på 2000 tegn
        username: username.substring(0, 80) // Discord har grense på 80 tegn for brukernavn
        // Du kan legge til flere felter her for rikere meldinger (embeds etc.)
        // Se Discord API dokumentasjon: https://discord.com/developers/docs/resources/webhook#execute-webhook
        /* Eksempel på embed:
        embeds: [{
            title: "Ny Økt Logget!",
            description: message,
            color: 3066993 // Fargekode (grønn)
        }]
        */
    };

    try {
        console.log(`Sender til Discord: "${payload.content}" as ${payload.username}`);
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Logg feilmelding fra Discord hvis mulig
            const errorText = await response.text();
            console.error(`Discord webhook error! Status: ${response.status}. Response: ${errorText}`);
        } else {
            console.log("Melding sendt til Discord webhook successfully.");
        }
    } catch (error) {
        console.error("Nettverksfeil eller feil ved sending til Discord webhook:", error);
    }
}

// Eksempel på bruk (kalles fra Script 2):
// sendToDiscord("Helgrim fullførte nettopp en økt og tjente 150 XP!", "Fit G4FL");