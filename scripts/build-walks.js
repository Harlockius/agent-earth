#!/usr/bin/env node
/**
 * Scans travels/*.json and generates public/walks.json
 * Run: node scripts/build-walks.js
 */
const fs = require('fs');
const path = require('path');

const travelsDir = path.join(__dirname, '..', 'travels');
const outFile = path.join(__dirname, '..', 'public', 'walks.json');

const files = fs.readdirSync(travelsDir).filter(f => f.endsWith('.json'));

const walks = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(travelsDir, file), 'utf8'));
  
  // Skip if no waypoints
  if (!data.waypoints || data.waypoints.length === 0) continue;

  // Parse city/country
  const cityStr = data.city || '';
  const parts = cityStr.split(',').map(s => s.trim());
  const city = parts[0] || 'Unknown';
  const country = parts[1] || '';

  // Compute center from waypoints
  const lats = data.waypoints.map(w => w.lat);
  const lngs = data.waypoints.map(w => w.lng);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  // Walker name (capitalize first letter)
  const walker = data.walker || 'unknown';
  const walkerName = walker.charAt(0).toUpperCase() + walker.slice(1);

  // Emoji mapping (extensible)
  const emojiMap = {
    claudie: '🌟',
    oscar: '🦴',
  };

  // Region from filename
  const region = file
    .replace(/^[^-]+-/, '')  // remove walker prefix
    .replace('.json', '')
    .split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

  walks.push({
    id: file.replace('.json', ''),
    walker: walkerName,
    walkerEmoji: emojiMap[walker.toLowerCase()] || '🚶',
    model: data.model || 'unknown',
    city,
    country,
    region,
    date: data.date || 'unknown',
    title: data.title || file,
    subtitle: data.subtitle || '',
    points: data.waypoints.length,
    center: [centerLat, centerLng],
    file: file
  });
}

// Sort by date desc, then walker
walks.sort((a, b) => b.date.localeCompare(a.date) || a.walker.localeCompare(b.walker));

// Copy travel JSONs to public/ for serving
for (const file of files) {
  fs.copyFileSync(
    path.join(travelsDir, file),
    path.join(__dirname, '..', 'public', file)
  );
}

fs.writeFileSync(outFile, JSON.stringify({ walks }, null, 2));
console.log(`✅ Generated walks.json with ${walks.length} walks`);
