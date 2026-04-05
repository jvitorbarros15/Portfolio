module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ ok: false, error: 'Method not allowed' });
        return;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
    const market = process.env.SPOTIFY_MARKET || 'US';

    if (!clientId || !clientSecret || !playlistId) {
        res.status(500).json({
            ok: false,
            error: 'Spotify env vars missing. Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_PLAYLIST_ID.'
        });
        return;
    }

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            res.status(500).json({ ok: false, error: 'Failed to authenticate with Spotify.' });
            return;
        }

        const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=${encodeURIComponent(market)}`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const playlistData = await playlistResponse.json();
        if (!playlistResponse.ok) {
            res.status(500).json({ ok: false, error: 'Failed to fetch playlist data from Spotify.' });
            return;
        }

        const tracks = (playlistData.tracks?.items || [])
            .map(item => item.track)
            .filter(Boolean)
            .slice(0, 10)
            .map(track => ({
                name: track.name,
                album: track.album?.name || '',
                artists: (track.artists || []).map(artist => artist.name),
                url: track.external_urls?.spotify || ''
            }));

        res.status(200).json({
            ok: true,
            playlist: {
                name: playlistData.name,
                description: stripHtml(playlistData.description || ''),
                owner: playlistData.owner?.display_name || '',
                url: playlistData.external_urls?.spotify || '',
                image: playlistData.images?.[0]?.url || ''
            },
            tracks
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Unexpected Spotify API error.' });
    }
};

function stripHtml(value) {
    return String(value).replace(/<[^>]*>/g, '');
}
