// Handle clicks on the extension icon
browser.browserAction.onClicked.addListener(() => {
  // Open the markdown editor in a new tab
  browser.tabs.create({
    url: browser.runtime.getURL("editor.html")
  });
});

// Initialize default markdown if not already set
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get('markdownBookmarks').then(result => {
    if (!result.markdownBookmarks) {
      const defaultMarkdown = 
`## Personal

- [Kagi](https://www.kagi.com)
- [Checkvist](https://checkvist.com)
- [Reddit](https://www.reddit.com)
- [Spotify](https://www.spotify.com)

## Work

- [Microsoft 365](https://www.microsoft365.com)
- [Slack](https://slack.com)
- [Zoom](https://zoom.us)
- [Trello](https://trello.com)

## Dev

- [GitHub](https://github.com)
- [Stack Overflow](https://stackoverflow.com)
- [MDN Web Docs](https://developer.mozilla.org)
- [CodePen](https://codepen.io)
- [VS Code](https://code.visualstudio.com)`;

      browser.storage.local.set({ markdownBookmarks: defaultMarkdown });
    }
  });
});

// Listen for messages from content script or editor
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getMarkdown") {
    browser.storage.local.get('markdownBookmarks').then(result => {
      sendResponse({ markdown: result.markdownBookmarks || "" });
    });
    return true; // Required for async response
  }

    if (message.action === "openEditor") {
      browser.tabs.create({
        url: browser.runtime.getURL("editor.html")
      });
   }

  if (message.action === "saveMarkdown") {
    browser.storage.local.set({ markdownBookmarks: message.markdown }).then(() => {
      // Notify all tabs to update the toolbar
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          browser.tabs.sendMessage(tab.id, { action: "updateToolbar" })
            .catch(err => console.log("Tab not ready for message:", err));
        });
      });
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }
});
