document.addEventListener('DOMContentLoaded', async () => {
  // Fetch latest 9 prompts
  async function fetchRecentPrompts() {
    const grid = document.getElementById('recentPromptsGrid');
    if (!grid) return;

    // 1. Try to load from cache first for instant render
    const cachedPrompts = localStorage.getItem('promptlier_home_prompts');
    if (cachedPrompts) {
      try {
        const parsedCache = JSON.parse(cachedPrompts);
        renderPromptsData(parsedCache);
      } catch (e) {
        console.error('Error parsing cached prompts', e);
      }
    }
    // No else statement needed: The HTML file itself provides the pulsing structure now.

    try {
      // 2. Fetch fresh data from Supabase in the background
      const { data, error } = await window.supabaseClient
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(9);

      if (error) throw error;

      // 3. Update Cache & Re-render
      if (data && data.length > 0) {
        localStorage.setItem('promptlier_home_prompts', JSON.stringify(data));
        renderPromptsData(data);
      } else {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">No prompts available yet.</p>';
      }
    } catch (err) {
      console.error('Error fetching prompts:', err);
      if (!cachedPrompts) {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:red;">Error loading prompts.</p>';
      }
    }
  }

  // Helper function to render prompts to keep code DRY
  function renderPromptsData(data) {
    const grid = document.getElementById('recentPromptsGrid');
    if (!grid) return;

    grid.innerHTML = ''; // clear loading text or old cache


    data.forEach(prompt => {
      // 1. Generate SEO-friendly slug (or fallback to ID if no title)
      const slugTitle = prompt.title
        ? prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        : 'prompt';

      const card = document.createElement('a');
      card.href = `prompt.html?id=${prompt.id}&title=${slugTitle}`;
      card.className = 'prompt-card';
      card.style.display = 'block';

      // NEW: Pre-load the data into localStorage for instant rendering on the next page
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
                <button class="btn btn-outline" style="padding: 5px 10px;" aria-label="Like">♡</button>
                <button class="btn btn-primary" style="padding: 5px 10px;">View</button>
              </div>
            </div>
          </div>
        `;
      grid.appendChild(card);
    });
  }

  // Fetch latest 6 blogs
  async function fetchLatestBlogs() {
    const grid = document.getElementById('latestBlogsGrid');
    if (!grid) return;

    // 1. Try to load from cache first
    const cachedBlogs = localStorage.getItem('promptlier_home_blogs');
    if (cachedBlogs) {
      try {
        const parsedCache = JSON.parse(cachedBlogs);
        renderBlogsData(parsedCache);
      } catch (e) {
        console.error('Error parsing cached blogs', e);
      }
    }
    // The HTML has predefined structure, so we don't need a default loading state here.

    try {
      // 2. Fetch fresh data
      const { data, error } = await window.supabaseClient
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // 3. Update Cache & Re-render
      if (data && data.length > 0) {
        localStorage.setItem('promptlier_home_blogs', JSON.stringify(data));
        renderBlogsData(data);
      } else {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">No articles available yet.</p>';
      }

    } catch (err) {
      console.error('Error fetching blogs:', err);
      if (!cachedBlogs) {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:red;">Error loading articles.</p>';
      }
    }
  }

  function renderBlogsData(data) {
    const grid = document.getElementById('latestBlogsGrid');
    if (!grid) return;

    grid.innerHTML = ''; // clear loading text or old cache


    data.forEach(blog => {
      const createDate = new Date(blog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      const coverImg = blog.cover_image_url || '';

      const card = document.createElement('a');
      card.href = 'blog.html?slug=' + encodeURIComponent(blog.slug);
      card.className = 'blog-card';

      // NEW: Pre-load the data into localStorage for instant rendering
      card.addEventListener('click', () => {
        localStorage.setItem('promptlier_current_blog_preload', JSON.stringify(blog));
      });

      // Safely strip rich-text HTML and extract the first 25 words
      let excerpt = '';
      if (blog.body_content) {
        const rawText = blog.body_content.replace(/<[^>]*>?/gm, ''); // Strip HTML tags
        // Decode common HTML entities
        const decodedText = rawText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        const words = decodedText.trim().split(/\s+/);
        if (words.length > 25) {
          excerpt = words.slice(0, 25).join(' ') + ' <span style="color: var(--accent); font-weight: 500; margin-left: 5px;">... Read more →</span>';
        } else {
          excerpt = decodedText + ' <span style="color: var(--accent); font-weight: 500; margin-left: 5px;"> Read more →</span>';
        }
      } else {
        // Fallback to meta_desc if for some reason the body is completely empty
        excerpt = blog.meta_desc || 'Read article...';
      }

      card.innerHTML = `
          <img src="${coverImg}" alt="${blog.title}" class="blog-image">
          <div class="blog-content">
            <span class="blog-date">${createDate}</span>
            <h3 class="blog-title">${blog.title}</h3>
            <p class="blog-desc">${excerpt}</p>
          </div>
        `;
      grid.appendChild(card);
    });
  }

  // Fetch top 3 trending prompts (by likes)
  async function fetchTrendingPrompts() {
    const grid = document.getElementById('trendingPromptsGrid');
    if (!grid) return;

    // 1. Try to load from cache first
    const cachedTrending = localStorage.getItem('promptlier_home_trending');
    if (cachedTrending) {
      try {
        const parsedCache = JSON.parse(cachedTrending);
        renderTrendingData(parsedCache);
      } catch (e) {
        console.error('Error parsing cached trending', e);
      }
    } else {
      grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">Loading trending styles...</p>';
    }

    try {
      // 2. Fetch fresh data ordered by likes
      const { data, error } = await window.supabaseClient
        .from('prompts')
        .select('*')
        .order('likes', { ascending: false }) // Requires a 'likes' column in Supabase!
        .limit(3);

      if (error) throw error;

      // 3. Update Cache & Re-render
      if (data && data.length > 0) {
        localStorage.setItem('promptlier_home_trending', JSON.stringify(data));
        renderTrendingData(data);
      } else {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);">No trending prompts yet.</p>';
      }
    } catch (err) {
      console.error('Error fetching trending prompts:', err);
      if (!cachedTrending) {
        grid.innerHTML = '<p style="text-align:center;width:100%;color:red;">Error loading trending styles.</p>';
      }
    }
  }

  function renderTrendingData(data) {
    const grid = document.getElementById('trendingPromptsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    data.forEach(prompt => {
      // 1. Generate SEO-friendly slug
      const slugTitle = prompt.title
        ? prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        : 'prompt';

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
  }

  // Initialize all fetches
  fetchTrendingPrompts();
  fetchRecentPrompts();
  fetchLatestBlogs();
});
