console.log('%c[CONTENT SCRIPT] 🚀 Loading...', 'color: #4CAF50; font-size: 20px; font-weight: bold');

let lastActive = Date.now();
let filterInterval = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('message', `Received message: ${message.type}`, message);
  
  if (message.type === 'ping') {
    log('message', 'Sending pong response');
    sendResponse('pong');
    return;
  }
  
  if (message.type === 'startGrayScale') {
    try {
      log('grayscale', '⏳ Starting grayscale sequence', {
        'Duration': message.duration,
        'Timestamp': new Date().toLocaleTimeString()
      });
      applyGrayScale();
      sendResponse('ok');
    } catch (error) {
      log('error', '❌ Failed to apply grayscale', error);
      sendResponse({ error: error.message });
    }
  } else if (message.type === 'stopGrayScale') {
    try {
      log('grayscale', '⏳ Starting grayscale removal');
      removeGrayScale();
      sendResponse('ok');
    } catch (error) {
      log('error', '❌ Failed to remove grayscale', error);
      sendResponse({ error: error.message });
    }
  }
  
  return true;
});

function log(type, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  const styles = {
    message: 'color: #2196F3; font-weight: bold; font-size: 12px',    // Blue
    grayscale: 'color: #9C27B0; font-weight: bold; font-size: 12px',  // Purple
    error: 'color: #F44336; font-weight: bold; font-size: 12px',      // Red
    success: 'color: #4CAF50; font-weight: bold; font-size: 12px',    // Green
    info: 'color: #FF9800; font-weight: bold; font-size: 12px'        // Orange
  };

  console.log(
    `%c[${type.toUpperCase()}] ${timestamp}:\n${message}`, 
    styles[type] || styles.info
  );
  
  if (data) {
    console.log('Details:', data);
  }
}

function createGrayScaleStyle() {
  log('grayscale', '🎨 Creating grayscale style element');
  const style = document.createElement('style');
  style.id = 'youtube-grayscale-style';
  style.textContent = `
    html {
      -webkit-filter: grayscale(100%) !important;
      -moz-filter: grayscale(100%) !important;
      filter: grayscale(100%) !important;
      transition: all 0.3s ease !important;
    }
  `;
  return style;
}

function applyGrayScale() {
  log('grayscale', '🔄 Starting grayscale application');
  
  // Remove any existing grayscale style
  removeGrayScale();
  
  // Add the grayscale style to the document
  const style = createGrayScaleStyle();
  document.head.appendChild(style);
  log('grayscale', '✅ Style element added to document head');
  
  // Also apply directly to document element for immediate effect
  document.documentElement.style.filter = 'grayscale(100%)';
  document.documentElement.style.webkitFilter = 'grayscale(100%)';
  log('grayscale', '✅ Direct styles applied to document element');
  
  // Verify the styles were applied
  const computedStyle = window.getComputedStyle(document.documentElement);
  log('info', '🔍 Current filter styles:', {
    'filter': computedStyle.filter,
    'webkitFilter': computedStyle.webkitFilter,
    'styleElement': !!document.getElementById('youtube-grayscale-style')
  });
}

function removeGrayScale() {
  log('grayscale', '🔄 Starting grayscale removal');
  
  // Remove the style element if it exists
  const style = document.getElementById('youtube-grayscale-style');
  if (style) {
    style.remove();
    log('grayscale', '✅ Style element removed');
  } else {
    log('info', '⚠️ No style element found to remove');
  }
  
  // Remove direct styles from document element
  document.documentElement.style.filter = 'none';
  document.documentElement.style.webkitFilter = 'none';
  log('grayscale', '✅ Direct styles removed from document element');
  
  // Verify the styles were removed
  const computedStyle = window.getComputedStyle(document.documentElement);
  log('info', '🔍 Current filter styles after removal:', {
    'filter': computedStyle.filter,
    'webkitFilter': computedStyle.webkitFilter,
    'styleElement': !!document.getElementById('youtube-grayscale-style')
  });
}

// Activity tracking
document.addEventListener('mousemove', updateActivity);
document.addEventListener('keypress', updateActivity);
document.addEventListener('scroll', updateActivity);

function updateActivity() {
  const now = Date.now();
  if (now - lastActive >= 60000) {
    chrome.runtime.sendMessage({ type: 'activity_update', timestamp: now });
  }
  lastActive = now;
}

// Log when script is loaded
log('info', '🚀 YouTube grayscale script loaded and ready');

// Add this function for manual testing
window.testGrayscale = function() {
  console.log('Manual grayscale test initiated');
  applyGrayScale();
  
  setTimeout(() => {
    console.log('Removing grayscale after 5 seconds');
    removeGrayScale();
  }, 5000);
};

// Add this to verify script is fully loaded
console.log('%c[CONTENT SCRIPT] ✅ Loaded successfully', 'color: #4CAF50; font-size: 20px; font-weight: bold');
