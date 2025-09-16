import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
	'/login',
	'/api/login',
	'/api/logout',
	'/_next',
	'/favicon.ico',
	'/robots.txt',
	'/sitemap.xml',
	'/api/postBlog'
];

export function middleware(req) {
	const { pathname } = req.nextUrl;

	// Allow public assets and whitelisted endpoints
	if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
		return NextResponse.next();
	}

	// Require auth cookie for all other paths
	const cookie = req.cookies.get('site_auth');
	if (cookie && cookie.value === '1') {
		return NextResponse.next();
	}

	const url = req.nextUrl.clone();
	url.pathname = '/login';
	url.searchParams.set('next', pathname);
	return NextResponse.redirect(url);
}

export const config = {
	matcher: ['/((?!_next/static|_next/image).*)']
};
