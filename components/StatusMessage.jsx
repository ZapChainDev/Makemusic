export default function StatusMessage({ status }) {
	if (!status) return null;
	return (
		<div className={`status ${status.ok ? 'ok' : 'error'}`}>{status.message}</div>
	);
}
