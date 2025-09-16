export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
	const { password } = req.body || {};
	const expected = process.env.SITE_PASSWORD;
	if (!expected) return res.status(500).json({ error: 'SITE_PASSWORD not configured' });
	if (!password || password !== expected) return res.status(401).json({ error: 'Invalid password' });

	// Set a simple auth cookie
	res.setHeader('Set-Cookie', `site_auth=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
	const next = req.query?.next || '/';
	return res.status(200).json({ ok: true, next });
}
