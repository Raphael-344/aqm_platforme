export function aqiColor(aqi: number): string {
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Bon';
  if (aqi <= 100) return 'Modéré';
  if (aqi <= 150) return 'Mauvais pour groupes sensibles';
  if (aqi <= 200) return 'Mauvais';
  if (aqi <= 300) return 'Très mauvais';
  return 'Dangereux';
}

export function aqiRgb(aqi: number): [number, number, number] {
  if (aqi <= 50) return [0, 228, 0];
  if (aqi <= 100) return [255, 255, 0];
  if (aqi <= 150) return [255, 126, 0];
  if (aqi <= 200) return [255, 0, 0];
  if (aqi <= 300) return [143, 63, 151];
  return [126, 0, 35];
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function simulateSigfoxCount(): number {
  const now = new Date();
  const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const elapsed = (now.getTime() - startOfHour.getTime()) / 1000;
  const rate = 0;
  return Math.floor(elapsed * rate);
}
