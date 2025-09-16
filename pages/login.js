import { useState } from 'react';

export default function Login() {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function onSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			const res = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Login failed');
			window.location.href = data.next || '/';
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="container">
			<div className="card">
				<h1 style={{ marginTop: 0 }}>Sign in</h1>
				<form onSubmit={onSubmit}>
					<input
						type="password"
						placeholder="Enter site password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={{ width: '100%', padding: 10, fontSize: 16, marginBottom: 12 }}
					/>
					<button className="btn" type="submit" disabled={loading || !password}>
						{loading ? 'Signing in...' : 'Sign in'}
					</button>
					{error && <div className="status error">{error}</div>}
				</form>
			</div>
		</div>
	);
}
