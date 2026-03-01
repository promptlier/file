document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the prompt ID from the URL Query String
    const urlParams = new URLSearchParams(window.location.search);
    const promptId = urlParams.get('id');

    // 2. DOM Elements to populate
    const detailImage = document.getElementById('detailImage');
    const detailTitle = document.getElementById('detailTitle');
    const detailCategory = document.getElementById('detailCategory');
    const detailModel = document.getElementById('detailModel');
    const detailPromptText = document.getElementById('detailPromptText');
    const copyBtn = document.getElementById('copyPromptBtn');
    const shareBtn = document.getElementById('shareBtn');

    // If no ID is found in the URL, redirect back to the home page to prevent a broken page
    if (!promptId) {
        window.location.href = 'index.html';
        return;
    }

    // 3. Fetch or Load the exact prompt
    async function loadPromptDetails() {
        // --- ⚡ INSTANT LOAD START ---
        // Try to load pre-loaded data from localStorage first
        const preloadedDataStr = localStorage.getItem('promptlier_current_prompt_preload');
        let hasPreloaded = false;

        if (preloadedDataStr) {
            try {
                const preloadedData = JSON.parse(preloadedDataStr);

                // Make sure the preloaded data matches the URL ID 
                // AND clear it so a manual page refresh doesn't show old data
                if (preloadedData.id == promptId) {
                    renderPromptData(preloadedData);
                    fetchRelatedPrompts(preloadedData.category, promptId);
                    hasPreloaded = true;
                    // Clean up!
                    localStorage.removeItem('promptlier_current_prompt_preload');
                }
            } catch (e) {
                console.error("Failed to parse preload data", e);
            }
        }
        // --- ⚡ INSTANT LOAD END ---

        // If we didn't have preloaded data, show loading text
        if (!hasPreloaded) {
            document.title = "Loading... | Promptlier";
            detailTitle.innerText = "Loading prompt details...";
        }

        try {
            // Fetch fresh data in the background (or foreground if no preload)
            const { data, error } = await window.supabaseClient
                .from('prompts')
                .select('*')
                .eq('id', promptId)
                .single();

            if (error) throw error;
            if (!data) {
                detailTitle.innerText = "Prompt not found.";
                return;
            }

            // Always render with the freshest data from the DB to be safe
            renderPromptData(data);

            // Only fetch related prompts now if we didn't already trigger it during preload
            if (!hasPreloaded) {
                fetchRelatedPrompts(data.category, data.id);
            }

        } catch (err) {
            console.error("Error loading prompt details:", err);
            if (!hasPreloaded) {
                detailTitle.innerText = "Error loading prompt.";
            }
        }
    }

    // Helper function to keep rendering DRY
    function renderPromptData(data) {
        document.title = `${data.title} | Promptlier`;
        detailTitle.innerText = data.title;

        detailCategory.innerText = data.category;
        detailCategory.style.display = 'inline-block';

        if (data.model) {
            detailModel.innerText = data.model;
            detailModel.style.display = 'inline-block';
        } else {
            detailModel.style.display = 'none';
        }

        detailPromptText.innerText = data.prompt_text;

        if (data.image_url) {
            detailImage.src = data.image_url;
            detailImage.alt = data.title;
            detailImage.style.display = 'block';
        }

        copyBtn.setAttribute('data-prompt', data.prompt_text);
    }

    // 5. Setup the Copy Button logic
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const textToCopy = copyBtn.getAttribute('data-prompt');

            if (!textToCopy) return;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = copyBtn.innerHTML;

                // Visual feedback
                copyBtn.style.backgroundColor = '#10B981'; // Success Green
                copyBtn.style.color = '#fff';
                copyBtn.style.borderColor = '#10B981';
                copyBtn.innerHTML = '✓ Copied to Clipboard!';

                // Reset button after 2 seconds
                setTimeout(() => {
                    copyBtn.style.backgroundColor = '';
                    copyBtn.style.color = '';
                    copyBtn.style.borderColor = '';
                    copyBtn.innerHTML = originalHTML;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    }

    // 6. Setup the Share Button logic
    if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // We need a title to share
            const shareTitle = `${detailTitle.innerText} | Promptlier`;
            const shareUrl = window.location.href;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: shareTitle,
                        url: shareUrl
                    });
                } catch (err) {
                    console.error('Error sharing:', err);
                }
            } else {
                // Fallback if browser doesn't support native sharing (copy link instead)
                navigator.clipboard.writeText(shareUrl).then(() => {
                    const originalHTML = shareBtn.innerHTML;
                    shareBtn.innerHTML = '<span style="font-size: 0.8rem; font-weight: bold;">Link Copied!</span>';
                    setTimeout(() => {
                        shareBtn.innerHTML = originalHTML;
                    }, 2000);
                });
            }
        });
    }

    // 7. Fetch "More like this"
    async function fetchRelatedPrompts(category, currentId) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        try {
            // Fetch 3 prompts from the same category, excluding the one we are currently viewing
            const { data, error } = await window.supabaseClient
                .from('prompts')
                .select('*')
                .eq('category', category)
                .neq('id', currentId)
                .limit(3);

            if (error) throw error;

            grid.innerHTML = '';

            if (!data || data.length === 0) {
                grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">No related prompts found.</p>';
                return;
            }

            data.forEach(prompt => {
                const slugTitle = prompt.title
                    ? prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                    : 'prompt';

                // We reuse the exact same card HTML structure as index.js and gallery.js
                const card = document.createElement('a');
                card.href = `prompt.html?id=${prompt.id}&title=${slugTitle}`;
                card.className = 'prompt-card';
                card.style.display = 'block';

                // NEW: Pre-load the data into localStorage for instant rendering
                card.addEventListener('click', () => {
                    localStorage.setItem('promptlier_current_prompt_preload', JSON.stringify(prompt));
                });

                card.innerHTML = `
            <img src="${prompt.image_url || ''}" alt="${prompt.title}">
                <div class="prompt-overlay">
                    <p class="prompt-text">${prompt.prompt_text}</p>
                    <div class="prompt-actions">
                        <span class="tag">${prompt.category}</span>
                        <div>
                            <button class="btn btn-outline" style="padding: 5px 10px;" aria-label="Like">♡ ${prompt.likes || 0}</button>
                            <button class="btn btn-primary" style="padding: 5px 10px;">View</button>
                        </div>
                    </div>
                </div>
        `;
                grid.appendChild(card);
            });

        } catch (err) {
            console.error("Error loading related prompts:", err);
            grid.innerHTML = '<p style="text-align:center;width:100%;color:red;">Error loading related prompts.</p>';
        }
    }

    // Fetch the data on load
    loadPromptDetails();
});
