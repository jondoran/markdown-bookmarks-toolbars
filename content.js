// Parse markdown into bookmark lists
function parseMarkdown(markdown) {
  const lists = {};
  let currentList = null;

  const lines = markdown.split('\n');
  for (const line of lines) {
    // Check for h2 headers
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentList = headerMatch[1].trim();
      lists[currentList] = [];
      continue;
    }

    // Check for list items with links (both * and - formats)
    const linkMatch = line.match(/^[\*\-]\s+\[(.+?)\]\((.+?)\)/);
    if (linkMatch && currentList) {
      lists[currentList].push({
        title: linkMatch[1].trim(),
        url: linkMatch[2].trim()
      });
    }
  }

  return lists;
}

// Create favicon element
function createFavicon(url) {
  const favicon = document.createElement('img');
  favicon.className = 'md-bookmark-favicon';

  try {
    // Extract domain safely
    const domain = new URL(sanitizeUrl(url)).hostname;
    favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}`;
  } catch (e) {
    // Fallback to a default icon if URL parsing fails
    favicon.src = browser.runtime.getURL('icons/default-favicon.png');
    // If you don't have a default icon, use a data URI for a simple icon
    // favicon.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"%3E%3Crect width="16" height="16" fill="%23ddd"/%3E%3C/svg%3E';
  }

  favicon.width = 16;
  favicon.height = 16;

  // Add error handling for favicon loading
  favicon.onerror = () => {
    favicon.src = browser.runtime.getURL('icons/default-favicon.png');
    // Or use data URI fallback as mentioned above
  };

  return favicon;
}

// Sanitize URLs to prevent malicious URL schemes
function sanitizeUrl(url) {
  // Basic URL sanitization
  if (!url || url.trim() === '') return '#';

  // Prevent javascript: and other potentially dangerous URL schemes
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase().trim();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn(`Blocked potentially unsafe URL: ${url}`);
      return '#';
    }
  }

  // Try to ensure the URL has a proper protocol
  if (!lowerUrl.startsWith('http://') && 
      !lowerUrl.startsWith('https://') && 
      !lowerUrl.startsWith('ftp://') &&
      !lowerUrl.startsWith('/') &&
      !lowerUrl.startsWith('#')) {
    // Add https if missing protocol
    return 'https://' + url;
  }

  return url;
}

function detectFixedHeaders() {
  // First, try common header selectors
  const headerSelectors = [
    'header', 'nav', '.header', '.navbar', '.nav-bar', '.top-bar', '.topbar',
    '[role="banner"]', '.site-header', '.global-header', '.app-header',
    '#header', '#navbar', '#nav', '#top-bar'
  ];

  let potentialHeaders = [];

  // Try targeted selectors first
  headerSelectors.forEach(selector => {
    potentialHeaders = potentialHeaders.concat(Array.from(document.querySelectorAll(selector)));
  });

  // If we didn't find any potential headers, check direct children of body
  if (potentialHeaders.length === 0) {
    potentialHeaders = Array.from(document.querySelectorAll('body > *'));
  }

  // Now filter for fixed/sticky elements
  const fixedElements = potentialHeaders.filter(el => {
    try {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (style.position === 'fixed' || style.position === 'sticky') && 
             parseFloat(style.top) === 0 && 
             rect.top < 50 && 
             rect.height > 0 && 
             rect.width > 0.5 * window.innerWidth;
    } catch (e) {
      return false;
    }
  });

  if (fixedElements.length === 0) return null;

  // Find the tallest fixed element
  return fixedElements.reduce((tallest, el) => {
    const rect = el.getBoundingClientRect();
    return rect.height > tallest.height ? { element: el, height: rect.height } : tallest;
  }, { element: null, height: 0 });
}

// Return CSS as a string
function loadToolbarCSS() {
  return `
    .markdown-bookmarks-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background-color: #f0f0f0;
      border-bottom: 1px solid #ccc;
      padding: 5px 10px;
      z-index: 999999;
      display: flex;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Add this to push down the page content */
    .markdown-bookmarks-content-shift {
      margin-top: 39px; /* Adjust this value based on your toolbar height */
    }

    .md-bookmark-selector {
      margin-right: 8px;
      padding: 0px 6px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      background-color: rgba(255, 255, 255, 0.8);
      font-size: 12px;
      min-width: 156px;
      height: 24px;
    }

    .md-bookmarks-container {
      display: flex;
      flex-wrap: wrap;
      overflow: hidden;
      align-items: center;
      height: 100%;
    }

    .md-bookmark {
      display: flex;
      align-items: center;
      padding: 0 6px;
      margin: 0 1px;
      text-decoration: none;
      color: inherit;
      border-radius: 3px;
      white-space: nowrap;
      height: 26px;
      font-size: 13px;
      font-weight: normal;
    }

    .md-bookmark:hover {
      background-color: var(--toolbarbutton-hover-background, rgba(0, 0, 0, 0.07));
    }

    .md-bookmark:active {
      background-color: var(--toolbarbutton-active-background, rgba(0, 0, 0, 0.15));
    }

    .md-bookmark-favicon {
      margin-right: 4px;
      width: 16px;
      height: 16px;
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .markdown-bookmarks-toolbar {
        background-color: #38383d;
        color: #f9f9fa;
        border-bottom-color: rgba(255, 255, 255, 0.1);
      }

      .md-bookmark-selector {
        background-color: rgba(255, 255, 255, 0.1);
        color: #f9f9fa;
        border-color: rgba(255, 255, 255, 0.2);
      }

      .md-bookmark:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .md-bookmark:active {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    .md-edit-button {
      margin-left: auto; /* Push to right side */
      background-color: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 13px;
      height: 26px;
      cursor: pointer;
      color: inherit;
    }

    .md-edit-button:hover {
      background-color: var(--toolbarbutton-hover-background, rgba(0, 0, 0, 0.07));
    }

    .md-edit-button:active {
      background-color: var(--toolbarbutton-active-background, rgba(0, 0, 0, 0.15));
    }

    /* Add this to the dark theme section */
    @media (prefers-color-scheme: dark) {
      .md-edit-button {
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .md-hide-button {
      background-color: transparent;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 13px;
      height: 26px;
      cursor: pointer;
      color: inherit;
      margin-left: 8px;
    }

    .md-hide-button:hover {
      background-color: var(--toolbarbutton-hover-background, rgba(0, 0, 0, 0.07));
    }

    .md-hide-button:active {
      background-color: var(--toolbarbutton-active-background, rgba(0, 0, 0, 0.15));
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .md-hide-button {
        border-color: rgba(255, 255, 255, 0.2);
      }
    }
  `;
}

// Create the toolbar UI with Shadow DOM isolation
function createToolbar(bookmarkLists) {
  // Remove existing toolbar container if any
  const existingContainer = document.getElementById('markdown-bookmarks-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  // Remove existing spacer if any
  const existingSpacer = document.getElementById('markdown-bookmarks-spacer');
  if (existingSpacer) {
    existingSpacer.remove();
  }

  // Create a container for our shadow DOM
  const container = document.createElement('div');
  container.id = 'markdown-bookmarks-container';

  // Attach shadow DOM (closed mode for better isolation)
  const shadow = container.attachShadow({ mode: 'closed' });

  // Create toolbar container
  const toolbar = document.createElement('div');
  toolbar.id = 'markdown-bookmarks-toolbar';
  toolbar.className = 'markdown-bookmarks-toolbar';

  // Check for fixed headers on the page
  const fixedHeader = detectFixedHeaders();
  if (fixedHeader && fixedHeader.element) {
    // Position our toolbar below the site's fixed header
    const headerHeight = fixedHeader.height;
    toolbar.style.top = `${headerHeight}px`;
  }

  // Create list selector
  const selector = document.createElement('select');
  selector.className = 'md-bookmark-selector';

  // Add options for each list
  const listNames = Object.keys(bookmarkLists);
  listNames.forEach(listName => {
    const option = document.createElement('option');
    option.value = listName;
    option.textContent = listName;
    selector.appendChild(option);
  });

  // Create bookmarks container
  const bookmarksContainer = document.createElement('div');
  bookmarksContainer.className = 'md-bookmarks-container';

  // Create edit button
  const editButton = document.createElement('button');
  editButton.className = 'md-edit-button';
  editButton.textContent = 'Edit';
  editButton.title = 'Edit Markdown Bookmarks';
  editButton.addEventListener('click', () => {
    browser.runtime.sendMessage({ action: "openEditor" });
  });

  // Create hide button
  const hideButton = document.createElement('button');
  hideButton.className = 'md-hide-button';
  hideButton.textContent = 'Hide';
  hideButton.title = 'Hide Markdown Bookmarks Toolbar (will reappear on page reload)';
  hideButton.addEventListener('click', () => {
    // Remove the container and spacer from the DOM
    container.remove();
    const spacer = document.getElementById('markdown-bookmarks-spacer');
    if (spacer) spacer.remove();
  });

  // Add elements to toolbar
  toolbar.appendChild(selector);
  toolbar.appendChild(bookmarksContainer);
  toolbar.appendChild(editButton);
  toolbar.appendChild(hideButton);

  // Create spacer element to prevent content overlap
  const spacer = document.createElement('div');
  spacer.id = 'markdown-bookmarks-spacer';
  spacer.className = 'markdown-bookmarks-content-shift';

  // Calculate appropriate spacer height
  const toolbarHeight = 39; // Default height from CSS
  if (fixedHeader && fixedHeader.element) {
    // If there's a fixed header, adjust spacer height
    spacer.style.marginTop = `${toolbarHeight + fixedHeader.height}px`;
  } else {
    // Default spacer height
    spacer.style.marginTop = `${toolbarHeight}px`;
  }

  // Add CSS to shadow DOM
  const style = document.createElement('style');
  style.textContent = loadToolbarCSS();

  // Add elements to shadow DOM
  shadow.appendChild(style);
  shadow.appendChild(toolbar);

  // Add spacer to main DOM (outside shadow DOM) to affect page layout
  document.body.insertBefore(spacer, document.body.firstChild);

  // Add container with shadow DOM to page
  document.body.insertBefore(container, document.body.firstChild);

  // Function to display bookmarks for selected list
  function displayBookmarks(listName) {
    // Clear the container safely
    while (bookmarksContainer.firstChild) {
      bookmarksContainer.removeChild(bookmarksContainer.firstChild);
    }

    if (!bookmarkLists[listName]) return;

    bookmarkLists[listName].forEach(bookmark => {
      const bookmarkElement = document.createElement('a');
      bookmarkElement.className = 'md-bookmark';
      bookmarkElement.href = sanitizeUrl(bookmark.url);
      bookmarkElement.title = bookmark.title;
      bookmarkElement.rel = "noopener noreferrer";
      bookmarkElement.target = "_blank"; // Open in new tab for security

      // Add favicon
      bookmarkElement.appendChild(createFavicon(bookmark.url));

      // Add title
      const titleSpan = document.createElement('span');
      titleSpan.textContent = bookmark.title;
      bookmarkElement.appendChild(titleSpan);

      bookmarksContainer.appendChild(bookmarkElement);
    });
  }

  // Display bookmarks for first list
  if (listNames.length > 0) {
    displayBookmarks(listNames[0]);
  }

  // Handle list selection change
  selector.addEventListener('change', (e) => {
    displayBookmarks(e.target.value);
  });

  return { container, spacer };
}

// Initialize the toolbar with error handling
async function initToolbar() {
  try {
    const response = await browser.runtime.sendMessage({ action: "getMarkdown" });
    if (response && response.markdown) {
      const bookmarkLists = parseMarkdown(response.markdown);
      createToolbar(bookmarkLists);
    }
  } catch (error) {
    console.error("Error initializing toolbar:", error);
  }
}

// Initialize on page load - with a slight delay to ensure page elements are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initToolbar, 100));
} else {
  setTimeout(initToolbar, 100); // Small delay to let any dynamic content settle
}


// Store the debounced function reference
const debouncedInitToolbar = debounce(initToolbar, 250);

// Add event listener
window.addEventListener('resize', debouncedInitToolbar);

// Debounce function to prevent excessive function calls
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Combined message listener
browser.runtime.onMessage.addListener((message, sender) => {
  // Verify the message is from our own extension
  if (sender.id !== browser.runtime.id) {
    console.warn("Received message from unauthorized sender:", sender.id);
    return false; // Indicate we didn't handle the message
  }

  switch (message.action) {
    case "updateToolbar":
      initToolbar();
      return true; // Indicate we handled the message

    case "cleanup":
      window.removeEventListener('resize', debouncedInitToolbar);
      return true;

    default:
      return false; // Indicate we didn't handle the message
  }
});

