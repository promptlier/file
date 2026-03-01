document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('mainGalleryGrid');
    const searchInput = document.querySelector('.search-input');
    const filterChips = document.querySelectorAll('.chip');

    let allPrompts = [];

    // Fetch all prompts from Supabase
    async function fetchAllPrompts() {
        if (!grid) return;

        try {
            const { data, error } = await window.supabaseClient
                .from('prompts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allPrompts = data || [];
            renderPrompts(allPrompts);

        } catch (err) {
            console.error('Error fetching prompts:', err);
            grid.innerHTML = '<p style="text-align:center;width:100%;color:red;grid-column: 1 / -1;">Error loading prompts.</p>';
        }
    }

    function renderPrompts(promptsToRender) {
        if (!grid) return;
        grid.innerHTML = '';

        if (promptsToRender.length === 0) {
            grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);grid-column: 1 / -1;">No prompts found matching your criteria.</p>';
            return;
        }

        promptsToRender.forEach(prompt => {
            // Create masonry item wrapper
            const item = document.createElement('div');
            item.className = 'masonry-item';

            // 1. Generate SEO-friendly slug
            const slugTitle = prompt.title
                ? prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                : 'prompt';

            const card = document.createElement('a'); // Make the whole card clickable!
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

            item.appendChild(card);
            grid.appendChild(item);
        });
    }

    // Handle Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            // Get the currently active filter, if any
            const activeChip = document.querySelector('.chip.active');
            let filterCategory = 'All';
            if (activeChip) {
                filterCategory = activeChip.innerText;
            }

            filterPrompts(searchTerm, filterCategory);
        });
    }

    // Handle Filter Chips
    if (filterChips.length > 0) {
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Update active class
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const filterCategory = chip.innerText;
                const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

                filterPrompts(searchTerm, filterCategory);
            });
        });
    }

    function filterPrompts(searchTerm, filterCategory) {
        let filtered = allPrompts;

        // Apply category filter
        if (filterCategory !== 'All') {
            filtered = filtered.filter(p => p.category && p.category.toLowerCase() === filterCategory.toLowerCase());
        }

        // Apply search filter
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(p => {
                const titleMatch = p.title && p.title.toLowerCase().includes(searchTerm);
                const textMatch = p.prompt_text && p.prompt_text.toLowerCase().includes(searchTerm);
                const categoryMatch = p.category && p.category.toLowerCase().includes(searchTerm);
                return titleMatch || textMatch || categoryMatch;
            });
        }

        renderPrompts(filtered);
    }

    // Initialize
    fetchAllPrompts();
});
