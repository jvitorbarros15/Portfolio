const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (error) {
        res.status(400).json({ ok: false, error: 'Invalid request body.' });
        return;
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const website = String(body.website || '').trim();
    const startedAt = Number(body.startedAt);

    // Bots commonly complete every input. Return a neutral success without
    // contacting the email provider so automated submissions learn nothing.
    if (website) {
        res.status(200).json({ ok: true });
        return;
    }

    if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < 1200) {
        res.status(429).json({ ok: false, error: 'Please wait a moment and try again.' });
        return;
    }

    if (!name || !email || !message) {
        res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
        return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL || 'jvitorbarros15@gmail.com';
    const from = process.env.CONTACT_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';

    if (!apiKey) {
        res.status(500).json({ ok: false, error: 'Email service is not configured yet.' });
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length > 120 || email.length > 200 || message.length > 5000) {
        res.status(400).json({ ok: false, error: 'Please check your name, email, and message length.' });
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: [to],
                reply_to: email,
                subject: `Portfolio inquiry from ${name}`,
                text: `${message}\n\n---\nFrom: ${name} <${email}>`,
                html: `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><hr><p>From: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`
            })
        });

        if (!response.ok) {
            const detail = await response.text();
            console.error('Resend error', response.status, detail);
            res.status(502).json({ ok: false, error: 'Email provider rejected the message.' });
            return;
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Contact send failed', error);
        res.status(500).json({ ok: false, error: 'Could not send the message.' });
    }
};
