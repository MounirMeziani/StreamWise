export class StorageManager {
  static DEFAULT_VALUES = {
    totalDailyUsage: 0,
    continuousUsage: 0,
    totalBlockTime: 0,
    lastActiveTime: null,
    lastResetDate: new Date().toDateString()
  };

  static CONTINUOUS_THRESHOLD = 0.5; // Default value, will be updated

  static async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  static async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  static async initialize() {
    const data = await chrome.storage.local.get(null);
    const currentDate = new Date().toDateString();
    
    // Reset daily counters if it's a new day
    if (data.lastResetDate !== currentDate) {
      await chrome.storage.local.set({
        ...this.DEFAULT_VALUES,
        lastResetDate: currentDate
      });
    } else if (Object.keys(data).length === 0) {
      await chrome.storage.local.set(this.DEFAULT_VALUES);
    }
  }

  static async updateUsageTime(duration) {
    if (duration <= 0.1) return; // Increased minimum duration threshold
    
    const [totalDailyUsage, continuousUsage] = await Promise.all([
      this.get('totalDailyUsage') || 0,
      this.get('continuousUsage') || 0
    ]);

    const newTotal = Math.round((totalDailyUsage + duration) * 100) / 100;
    const newContinuous = Math.round((continuousUsage + duration) * 100) / 100;
    
    // Only log significant changes
    if (Math.floor(newTotal) > Math.floor(totalDailyUsage)) {
      console.log('Total usage updated:', newTotal, 'minutes');
    }
    
    if (newContinuous >= this.CONTINUOUS_THRESHOLD * 0.8) {
      console.log('Continuous usage:', newContinuous, 'minutes');
    }

    await Promise.all([
      this.set('totalDailyUsage', newTotal),
      this.set('continuousUsage', newContinuous)
    ]);
  }

  static setThreshold(threshold) {
    this.CONTINUOUS_THRESHOLD = threshold;
  }
}
