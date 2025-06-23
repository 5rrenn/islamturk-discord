const crypto = require('crypto');
const fetch = require('node-fetch');


function decryptData(encryptedData) {
    try {
        
        const decodedString = Buffer.from(encryptedData, 'base64').toString('utf-8');
        return JSON.parse(decodedString);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}


function createDiscordEmbed(data) {
    
    const securityStatus = data.vpnDetected ? '🔴 VPN/Proxy Tespit Edildi' : '🟢 Güvenli Bağlantı';
    const embedColor = data.vpnDetected ? 0xe74c3c : 0x27ae60; 
    
    const embed = {
        title: "🆕 Yeni Kayıt Başvurusu - İslamTürk",
        color: embedColor,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: "https://cdn.discordapp.com/icons/1377746112240292051/a_39ed65b6e13fe29339bb33759a105ed7.webp"
        },
        fields: [
            {
                name: "👤 Kullanıcı Bilgileri",
                value: `**Discord Adı:** \`${data.discordName}\`\n**E-mail:** \`${data.email}\`\n**Cinsiyet:** ${data.gender}\n**Yaş:** ${data.age}\n**İstenen İsim:** \`${data.desiredName}\``,
                inline: false
            },
            {
                name: "🛡️ Güvenlik Durumu",
                value: `${securityStatus}\n**Fingerprint:** \`${data.fingerprint?.substring(0, 16)}...\``,
                inline: false
            },
            {
                name: "🌐 Konum Bilgileri",
                value: `**IP:** \`${data.ipAddress || 'Bilinmiyor'}\`\n**Şehir:** ${data.location?.city || 'Bilinmiyor'}\n**Ülke:** ${data.location?.country || 'Bilinmiyor'}\n**ISP:** ${data.location?.isp || 'Bilinmiyor'}`,
                inline: true
            },
            {
                name: "🖥️ Cihaz Bilgileri",
                value: `**Platform:** ${data.platform || 'Bilinmiyor'}\n**Ekran:** ${data.screenResolution || 'Bilinmiyor'}\n**Renk Derinliği:** ${data.colorDepth || 'Bilinmiyor'}bit\n**Bellek:** ${data.deviceMemory || 'Bilinmiyor'}GB`,
                inline: true
            },
            {
                name: "🌍 Sistem Bilgileri",
                value: `**Dil:** ${data.language || 'Bilinmiyor'}\n**Zaman Dilimi:** ${data.timezone || 'Bilinmiyor'}\n**Çekirdek Sayısı:** ${data.hardwareConcurrency || 'Bilinmiyor'}\n**Bağlantı:** ${data.connection?.effectiveType || 'Bilinmiyor'}`,
                inline: true
            }
        ],
        footer: {
            text: `İslamTürk Kayıt Sistemi • ${data.vpnDetected ? 'Güvenlik Uyarısı' : 'Güvenli'}`,
            icon_url: ""
        }
    };

    
    if (data.vpnDetected) {
        embed.fields.unshift({
            name: "⚠️ GÜVENLİK UYARISI",
            value: "Bu kullanıcı VPN/Proxy kullanıyor olabilir. Kayıt işlemini dikkatli değerlendirin.",
            inline: false
        });
    }

    return {
        embeds: [embed],
        content: data.vpnDetected ? 
            `🚨 **VPN/PROXY TESPİT EDİLDİ** - Yeni kayıt başvurusu!` : 
            `✅ Yeni kayıt başvurusu!`
    };
}

exports.handler = async (event, context) => {
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        
        const { data: encryptedData } = JSON.parse(event.body);
        
        if (!encryptedData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No data provided' })
            };
        }

        
        const decryptedData = decryptData(encryptedData);
        
        if (!decryptedData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid data format' })
            };
        }

        
        const requiredFields = ['discordName', 'email', 'gender', 'age', 'desiredName'];
        for (const field of requiredFields) {
            if (!decryptedData[field]) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Missing required field: ${field}` })
                };
            }
        }

        
        const discordMessage = createDiscordEmbed(decryptedData);

        
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        
        if (!webhookUrl) {
            console.error('Discord webhook URL not configured');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Webhook not configured' })
            };
        }

        const discordResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(discordMessage)
        });

        if (!discordResponse.ok) {
            const errorText = await discordResponse.text();
            console.error('Discord webhook error:', errorText);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to send to Discord' })
            };
        }

        
        console.log(`New registration: ${decryptedData.discordName} from ${decryptedData.location.city}`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Registration submitted successfully' 
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};