import { StorageManager } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const [totalDailyUsage, continuousUsage, totalBlockTime] = await Promise.all([
    StorageManager.get('totalDailyUsage'),
    StorageManager.get('continuousUsage'),
    StorageManager.get('totalBlockTime')
  ]);

  document.getElementById('dailyUsage').textContent = 
    `${Math.round(totalDailyUsage)} min`;
  document.getElementById('continuousUsage').textContent = 
    `${Math.round(continuousUsage)} min`;
  document.getElementById('blockTime').textContent = 
    `${Math.round(totalBlockTime)} min`;
});
