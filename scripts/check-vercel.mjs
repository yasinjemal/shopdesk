// Vercel serves public/ as static files and api/*.js as functions; there is nothing to bundle.
// This check fails the deployment early if an API route or a required page is missing.
import { access } from 'node:fs/promises';
for (const file of ['public/index.html', 'public/storage.js', 'api/studio.js', 'api/photos.js', 'api/photos/[id].js', 'api/[...path].js', 'server/vercel.js']) await access(file);
console.log('ShopDesk Vercel deployment files are present.');
