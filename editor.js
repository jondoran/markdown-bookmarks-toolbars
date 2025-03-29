document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('preview');
  const saveButton = document.getElementById('save-button');
  const successMessage = document.getElementById('success-message');

  // Load markdown content from storage
  browser.runtime.sendMessage({ action: "getMarkdown" }).then(response => {
    if (response && response.markdown) {
      editor.value = response.markdown;
      updatePreview();
    }
  });

  // Update preview when markdown changes
  editor.addEventListener('input', updatePreview);

  // Save changes
  saveButton.addEventListener('click', () => {
    browser.runtime.sendMessage({ 
      action: "saveMarkdown", 
      markdown: editor.value 
    }).then(response => {
      if (response && response.success) {
        showSuccessMessage();
      }
    });
  });

  // Show success message
  function showSuccessMessage() {
    successMessage.classList.add('show');
    setTimeout(() => {
      successMessage.classList.remove('show');
    }, 3000);
  }

  // Update preview
  function updatePreview() {
    // Clear the preview first
    while (preview.firstChild) {
      preview.removeChild(preview.firstChild);
    }

    // Simple markdown to HTML conversion for h2 and lists with links
    const markdown = editor.value;
    const lines = markdown.split('\n');
    let currentList = null;

    for (const line of lines) {
      // Handle h2 headers
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        if (currentList) {
          preview.appendChild(currentList);
          currentList = null;
        }
        const h2 = document.createElement('h2');
        h2.textContent = headerMatch[1].trim();
        preview.appendChild(h2);
        continue;
      }

      // Handle list items with links (both * and - formats)
      const linkMatch = line.match(/^[\*\-]\s+\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        if (!currentList) {
          currentList = document.createElement('ul');
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = linkMatch[2].trim();
        a.target = "_blank";
        a.textContent = linkMatch[1].trim();
        li.appendChild(a);
        currentList.appendChild(li);
        continue;
      }

      // Handle empty lines
      if (line.trim() === '') {
        if (currentList) {
          preview.appendChild(currentList);
          currentList = null;
        }
        const br = document.createElement('br');
        preview.appendChild(br);
      }
    }

    // Append any remaining list
    if (currentList) {
      preview.appendChild(currentList);
    }
  }
});
