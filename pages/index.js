import { useMemo, useState } from 'react';
import StatusMessage from '../components/StatusMessage';

export default function Home() {
	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(false);

	const nextRun = useMemo(() => {
		// Vercel Cron: 0 13 * * * (13:00 UTC daily)
		const now = new Date();
		const next = new Date();
		next.setUTCHours(13, 0, 0, 0);
		if (next <= now) {
			// Move to tomorrow 13:00 UTC
			next.setUTCDate(next.getUTCDate() + 1);
		}
		const local = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'full',
			timeStyle: 'short'
		}).format(next);
		const eastern = new Intl.DateTimeFormat('en-US', {
			dateStyle: 'full',
			timeStyle: 'short',
			timeZone: 'America/New_York'
		}).format(next);
		return { local, eastern };
	}, []);

	async function handlePost() {
		setLoading(true);
		setStatus(null);
		try {
			const res = await fetch(`/api/postBlog`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			let data = null;
			try {
				data = await res.json();
			} catch (_) {
				// Non-JSON error response
			}
			if (!res.ok) {
				const message = (data && data.error) || `Request failed (${res.status})`;
				throw new Error(message);
			}
			if (data && data.duplicate) {
				setStatus({ ok: true, message: `Already posted today: ${data.link}` });
			} else {
				setStatus({ ok: true, message: `Posted: ${(data && (data.link || data.url)) || 'Success'}` });
			}
		} catch (err) {
			setStatus({ ok: false, message: err.message || 'Something went wrong' });
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="container">
			<div className="card">
				<h1 style={{ marginTop: 0 }}>Carpet Installer Blog Automation</h1>
				<p style={{ marginTop: 8, color: '#4b5563' }}>
					Generate and publish a carpet installation tips blog post to WordPress.
				</p>
				<p style={{ marginTop: 8, color: '#111' }}>
					<strong>Next scheduled run</strong>: {nextRun.local} (your time) · {nextRun.eastern} (Eastern)
				</p>
				<button className="btn" onClick={handlePost} disabled={loading}>
					{loading ? 'Posting...' : 'Post Blog Now'}
				</button>
				<StatusMessage status={status} />
			</div>
		</div>
	);
}
