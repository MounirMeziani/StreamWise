import { StorageManager } from './utils/storage.js';

const CONFIG = {
  // Session pattern configuration
  SESSION_PATTERN: {
    SHORT_SESSIONS: {
      COUNT: 2, // Number of short sessions before a long break
      DURATION: {
        MIN: 10, // minutes
        MAX: 15  // minutes
      },
      BREAK: {
        DURATION: 30 // seconds
      }
    },
    LONG_SESSION: {
      DURATION: {
        MIN: 30, // minutes
        MAX: 35  // minutes
      },
      BREAK: {
        DURATION: 120 // seconds (2 minutes)
      }
    }
  },
  
  // Daily limits (keeping these for tracking purposes)
  DAILY_THRESHOLD: 999999,
  MAX_TOTAL_BLOCK_TIME: 60
};

// Set the threshold in StorageManager
StorageManager.setThreshold(CONFIG.CONTINUOUS_THRESHOLD);

// State variables
let isTracking = false;
let trackingInterval = null;
let startTime = null;
let currentTabId = null;
let lastVideoUrl = null;

// Add new session state variables
let sessionCount = 0;
let isInLongSession = false;
let currentSessionStart = null;
let currentSessionDuration = null;

// Add debounce function to prevent rapid start/stop
let debounceTimeout = null;
function debounce(func, wait) {
  return (...args) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => func(...args), wait);
  };
}

function isYouTubePage(url) {
  if (!url) return false;
  // Store the URL if it's a video page
  if (url.match(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/)) {
    lastVideoUrl = url;
  }
  return url.match(/^https?:\/\/(www\.)?youtube\.com\/(watch|playlist|feed|channel|c)\/?/);
}

const debouncedStartTracking = debounce((tabId) => {
  startTracking(tabId);
}, 1000); // Wait 1 second before starting tracking

const debouncedStopTracking = debounce(() => {
  stopTracking();
}, 1000); // Wait 1 second before stopping tracking

function log(type, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const style = {
    session: 'color: #4CAF50; font-weight: bold',    // Green
    tracking: 'color: #2196F3; font-weight: bold',   // Blue
    block: 'color: #F44336; font-weight: bold',      // Red
    grayscale: 'color: #9C27B0; font-weight: bold',  // Purple
    warning: 'color: #FFC107; font-weight: bold'     // Yellow
  };

  console.log(`%c[${type.toUpperCase()}] ${timestamp}:`, style[type], message);
  if (data) console.log('→', data);
}

function startTracking(tabId) {
  if (isTracking && currentTabId === tabId) return;
  
  if (isTracking) {
    stopTracking();
  }
  
  isTracking = true;
  currentTabId = tabId;
  startTime = Date.now();
  
  if (!currentSessionStart) {
    startNewSession();
  }
  
  log('tracking', 'Started tracking');
  
  trackingInterval = setInterval(async () => {
    const currentTime = Date.now();
    const duration = (currentTime - startTime) / 1000 / 60;
    const sessionElapsed = (currentTime - currentSessionStart) / 1000 / 60;
    
    log('tracking', 'Session progress', {
      'Time elapsed': `${Math.round(duration * 100) / 100} minutes`,
      'Session elapsed': `${Math.round(sessionElapsed * 100) / 100}/${currentSessionDuration} minutes`,
      'Session type': isInLongSession ? 'Long' : 'Short'
    });
    
    await StorageManager.updateUsageTime(duration);
    startTime = currentTime;
    
    await checkSessionThreshold(tabId);
  }, 30000);
}

function startNewSession() {
  currentSessionStart = Date.now();
  if (!isInLongSession && sessionCount >= CONFIG.SESSION_PATTERN.SHORT_SESSIONS.COUNT) {
    isInLongSession = true;
    sessionCount = 0;
    currentSessionDuration = getRandomDuration(
      CONFIG.SESSION_PATTERN.LONG_SESSION.DURATION.MIN,
      CONFIG.SESSION_PATTERN.LONG_SESSION.DURATION.MAX
    );
    log('session', `Starting long session (${currentSessionDuration} minutes)`);
  } else {
    currentSessionDuration = getRandomDuration(
      CONFIG.SESSION_PATTERN.SHORT_SESSIONS.DURATION.MIN,
      CONFIG.SESSION_PATTERN.SHORT_SESSIONS.DURATION.MAX
    );
    log('session', `Starting short session (${currentSessionDuration} minutes)`, 
      `Session count: ${sessionCount + 1}/${CONFIG.SESSION_PATTERN.SHORT_SESSIONS.COUNT}`);
  }
}

function getRandomDuration(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function checkSessionThreshold(tabId) {
  if (!currentSessionStart || !currentSessionDuration) return;
  
  const sessionElapsed = (Date.now() - currentSessionStart) / 1000 / 60; // minutes
  
  if (sessionElapsed >= currentSessionDuration) {
    const blockDuration = isInLongSession 
      ? CONFIG.SESSION_PATTERN.LONG_SESSION.BREAK.DURATION
      : CONFIG.SESSION_PATTERN.SHORT_SESSIONS.BREAK.DURATION;
    
    enforceBlock(tabId, blockDuration);
    
    if (!isInLongSession) {
      sessionCount++;
      console.log('Short session complete. Count:', sessionCount);
    } else {
      isInLongSession = false;
      console.log('Long session complete. Resetting to short sessions.');
    }
    
    // Start new session after block
    startNewSession();
  }
}

function stopTracking() {
  if (!isTracking) return;
  
  console.log('Stopping tracking');
  clearInterval(trackingInterval);
  
  if (startTime) {
    const finalDuration = (Date.now() - startTime) / 1000 / 60;
    if (finalDuration > 0.1) {
      StorageManager.updateUsageTime(finalDuration);
    }
  }
  
  isTracking = false;
  trackingInterval = null;
  startTime = null;
  currentTabId = null;
  lastVideoUrl = null;
  
  // Don't reset session state here to maintain pattern across tab switches
}

// Update event listeners to use debounced functions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (isYouTubePage(tab.url)) {
      debouncedStartTracking(tabId);
    } else if (currentTabId === tabId) {
      debouncedStopTracking();
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (isYouTubePage(tab.url)) {
    debouncedStartTracking(tab.id);
  } else {
    debouncedStopTracking();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentTabId === tabId) {
    debouncedStopTracking();
  }
});

async function checkThresholds(tabId) {
  const [totalDailyUsage, continuousUsage, totalBlockTime] = await Promise.all([
    StorageManager.get('totalDailyUsage'),
    StorageManager.get('continuousUsage'),
    StorageManager.get('totalBlockTime')
  ]);

  if (continuousUsage >= CONFIG.CONTINUOUS_THRESHOLD || 
      totalDailyUsage >= CONFIG.DAILY_THRESHOLD) {
    
    if (totalBlockTime < CONFIG.MAX_TOTAL_BLOCK_TIME) {
      const blockDuration = getRandomBlockDuration();
      enforceBlock(tabId, blockDuration);
      
      await StorageManager.set('continuousUsage', 0);
      await StorageManager.set('totalBlockTime', totalBlockTime + (blockDuration / 60));
    }
  }
}

function getRandomBlockDuration() {
  return Math.floor(
    Math.random() * (CONFIG.MAX_BLOCK_DURATION - CONFIG.MIN_BLOCK_DURATION + 1) + 
    CONFIG.MIN_BLOCK_DURATION
  );
}

// Add this function to check if a tab has our content script
async function ensureContentScriptLoaded(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
  } catch (error) {
    // If content script isn't loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['utils/storage.js', 'content.js']
    });
  }
}

// Add near the top after CONFIG
function logBackground(message, data = null) {
  console.log(
    `%c[BACKGROUND] ${new Date().toLocaleTimeString()}: ${message}`,
    'color: #2196F3; font-size: 12px; font-weight: bold'
  );
  if (data) console.log('Data:', data);
}

// Update the enforceBlock function
async function enforceBlock(tabId, duration) {
  const returnUrl = lastVideoUrl || 'https://youtube.com';
  logBackground('Enforcing block', { tabId, duration, returnUrl });
  
  try {
    // First verify the tab exists
    const tab = await chrome.tabs.get(tabId);
    logBackground('Tab verified', tab);

    // Show block page immediately
    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL('block.html')
    });
    logBackground('Block page shown');

    // Wait for block duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    logBackground('Block duration completed');

    // Return to video
    await chrome.tabs.update(tabId, {
      url: returnUrl
    });
    logBackground('Returned to video');

    // Wait for page to load then apply grayscale
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to inject the content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          console.log('[INJECTION] Content script injection attempted');
        }
      });
      logBackground('Injection successful');
    } catch (e) {
      logBackground('Injection failed', e);
    }

    // Apply grayscale after returning to video
    logBackground('Sending startGrayScale message');
    await chrome.tabs.sendMessage(tabId, { 
      type: 'startGrayScale',
      duration: 90
    });
    logBackground('startGrayScale message sent');

    // Keep grayscale for 90 seconds then remove it
    await new Promise(resolve => setTimeout(resolve, 90000));
    logBackground('Sending stopGrayScale message');
    await chrome.tabs.sendMessage(tabId, { 
      type: 'stopGrayScale'
    });
    logBackground('stopGrayScale message sent');

  } catch (error) {
    logBackground('Error during block sequence', error);
  }
}

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

chrome.runtime.onInstalled.addListener(() => {
  StorageManager.initialize();
});

// Reset counters at midnight
chrome.alarms.create('dailyReset', {
  when: getNextMidnight(),
  periodInMinutes: 24 * 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    StorageManager.initialize();
  }
});
