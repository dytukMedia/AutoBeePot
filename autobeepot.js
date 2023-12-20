const fs = require('fs');

const configFolder = 'Config';
const tokenFile = `${configFolder}/HoneygainToken.json`;
const configPath = `${configFolder}/HoneygainConfig.json`;

const header = { 'Authorization': '' };

function createConfig() {
    const config = {
        User: { email: 'example@AutoBee.pot', password: 'example', discord: 'discord.com/webhook', mention: '<@123>', currency: 'USD' },
        Settings: { 'Lucky Pot': true, Achievements: true, alert: 50 },
        Url: { login: 'https://dashboard.honeygain.com/api/v1/users/tokens', pot: 'https://dashboard.honeygain.com/api/v1/contest_winnings', balance: 'https://dashboard.honeygain.com/api/v1/users/balances', achievements: 'https://dashboard.honeygain.com/api/v1/achievements/', achievement_claim: 'https://dashboard.honeygain.com/api/v1/achievements/claim' }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

if (!fs.existsSync(configFolder)) fs.mkdirSync(configFolder);

if (!fs.existsSync(configPath) || fs.statSync(configPath).size === 0) {
    createConfig();
    console.log(`Config file created at: ${configPath}\nPlease edit the configuration file with the correct details.`);
    process.exit();
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (error) {
    console.error('Error reading config file:', error.message);
    process.exit();
}

if (!config.User || !config.Settings || !config.Url) createConfig();

const { Settings: settings, Url: urls, User: payload } = config;

async function login() {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    const response = await fetch(urls.login, options);
    if (response.ok) return await response.json();
    throw new Error(`Failed to login: ${response.statusText}`);
}

async function genToken(invalid = false) {
    if (!fs.existsSync(tokenFile) || fs.statSync(tokenFile).size === 0 || invalid) {
        try {
            const token = await login();
            fs.writeFileSync(tokenFile, JSON.stringify(token, null, 2));
            return token.data.access_token;
        } catch (error) {
            console.error('Error while logging in:', error.message);
            process.exit(-1);
        }
    }

    const tokenData = fs.readFileSync(tokenFile, 'utf-8');
    return JSON.parse(tokenData).data.access_token;
}

async function achievementsClaim() {
    if (!settings.Achievements) return false;

    try {
        const response = await fetch(urls.achievements, { headers: header });
        const achievements = await response.json();

        for (const achievement of achievements.data) {
            if (!achievement.is_claimed && achievement.progresses[0].current_progress === achievement.progresses[0].total_progress) {
                await fetch(urls.achievement_claim, { method: 'POST', headers: header, body: JSON.stringify({ user_achievement_id: achievement.id }) });
            }
        }

        return true;
    } catch (error) {
        if (error.message.includes('401')) {
            const newToken = await genToken(true);
            if (!newToken) process.exit(-1);
            header.Authorization = `Bearer ${newToken}`;
        }
        return true;
    }
}

async function sendDiscordMessage(webhookUrl, message, alert = false) {
    const pload = { content: alert ? payload.mention : null, embeds: [{ description: message, color: 16242827, author: { name: 'Honeygain', icon_url: 'https://cdn.jsdelivr.net/gh/danielytuk/AutoBeePot@main/hg_icon.png' }, footer: { text: 'Consider supporting free or paid:\nhttps://dytuk.media/pay' } }], username: 'AutoBeePot', avatar_url: 'https://cdn.jsdelivr.net/gh/danielytuk/AutoBeePot@main/bee.png' };

    try {
        const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pload) });
        return response.ok;
    } catch (error) {
        console.error('Error sending Discord message:', error.message);
        return false;
    }
}

function simplifyCreditAmount(creditValue) {
    const dollars = Math.floor(creditValue / 100);
    const cents = creditValue % 100;
    return `${dollars}.${cents.toString().padStart(2, '0')}`;
}

async function getConversionAmount(amount, currency) {
    if (!currency) currency = 'USD';
    const url = `https://dytuk.media/api/currency?from=USD&to=${currency}&amount=${amount}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) return data.amount_txt;
        throw new Error(`Failed to get conversion amount: ${data.message}`);
    } catch (error) {
        console.error('Error getting conversion amount:', error.message);
        return null;
    }
}

async function main() {
    try {
        const messages = [];

        let token = await genToken();
        if (!token) process.exit(-1);

        header.Authorization = `Bearer ${token}`;

        if (!(await achievementsClaim())) console.log('Failed to claim achievements.');

        let [dashboard, potWinning, balance] = await Promise.all([
            fetch(urls.balance, { headers: header }).then(response => response.json()),
            fetch(urls.pot, { method: "post", headers: header }).then(response => response.json()),
            fetch(urls.balance, { headers: header }).then(response => response.json())
        ]);

        if (dashboard.code === 401) {
            token = await genToken(true);
            header.Authorization = `Bearer ${token}`;
        }

        if (potWinning.title === 'user_is_not_eligible') return console.log("You're not eligible for the Lucky Pot yet.");
        else try { potWinning = await fetch(urls.pot, { headers: header }).then(response => response.json()); } catch(e) {}

        const potWinnings = settings['Lucky Pot'] ? potWinning.data.credits : potWinning.data.winning_credits;
        messages.push(`Lucky Pot Winnings: ${isNaN(Math.floor(potWinnings)) ? potWinning.data.winning_credits : Math.floor(potWinnings)} credits`);

        const creditBalance = balance.data.payout.usd_cents;
        const creditTotal = balance.data.payout.credits;
        const simplifiedBalance = simplifyCreditAmount(creditBalance);
        const conversionAmount = await getConversionAmount(simplifiedBalance, payload.currency);

        const convertedBal = parseFloat(conversionAmount.replace(` ${payload.currency}`, ''));

        const webhookPattern = /https:\/\/(?:ptb\.|canary\.)?discord\.com\/api\/webhooks\/\d+\/.+/;
        if (payload.discord && payload.discord !== '' && webhookPattern.test(payload.discord)) {
            const mentionPattern = /<@!?(\d{18})>|<@&(\d{18})>|@here|@everyone/;
            if (payload.mention && payload.mention !== '' && mentionPattern.test(payload.mention)) {
                if (convertedBal >= `${Number(settings.alert)}.0`) {
                    messages.push('Cashing out is now available.', '', `Total Credits: ${creditTotal} (${simplifiedBalance})`, `Localised Amount: ${conversionAmount}`);
                    await sendDiscordMessage(payload.discord, messages.join('\n'), true);
                } else {
                    messages.push(`Total Credits: ${creditTotal} (${simplifiedBalance})`, `Localised Amount: ${conversionAmount}`);
                    await sendDiscordMessage(payload.discord, messages.join('\n'), false);
                }
            }
        } else {
            console.log(messages.join('\n'));
        }

        console.clear();
    } catch (error) {
        console.error('Error in main function:', error.message);
    }
}

main();
