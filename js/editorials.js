document.addEventListener('DOMContentLoaded', async () => {
    async function fetchAllBlogs() {
        const grid = document.getElementById('allBlogsGrid');
        if (!grid) return;

        // Try to load from cache
        const cachedBlogs = localStorage.getItem('promptlier_editorials_all');
        if (cachedBlogs) {
            try {
                const parsedCache = JSON.parse(cachedBlogs);
                renderBlogsData(parsedCache);
            } catch (e) {
                console.error('Error parsing cached blogs', e);
            }
        }

        try {
            // Fetch fresh data from Supabase
            const { data, error } = await window.supabaseClient
                .from('blogs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                localStorage.setItem('promptlier_editorials_all', JSON.stringify(data));
                renderBlogsData(data);
            } else {
                grid.innerHTML = '<p style="text-align:center;width:100%;color:var(--text-muted);grid-column: 1 / -1;">No articles available yet.</p>';
            }

        } catch (err) {
            console.error('Error fetching blogs:', err);
            if (!cachedBlogs) {
                grid.innerHTML = '<p style="text-align:center;width:100%;color:red;grid-column: 1 / -1;">Error loading articles.</p>';
            }
        }
    }

    function renderBlogsData(data) {
        const grid = document.getElementById('allBlogsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        data.forEach(blog => {
            const createDate = new Date(blog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
            const coverImg = blog.cover_image_url || '';

            const card = document.createElement('a');
            card.href = 'blog.html?slug=' + encodeURIComponent(blog.slug);
            card.className = 'blog-card';

            card.addEventListener('click', () => {
                localStorage.setItem('promptlier_current_blog_preload', JSON.stringify(blog));
            });

            // Replicate the 25-word excerpt logic from homepage
            let excerpt = '';
            if (blog.body_content) {
                const rawText = blog.body_content.replace(/<[^>]*>?/gm, ''); // Strip HTML tags
                const decodedText = rawText.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

                const words = decodedText.trim().split(/\s+/);
                if (words.length > 25) {
                    excerpt = words.slice(0, 25).join(' ') + ' <span style="color: var(--accent); font-weight: 500; margin-left: 5px;">... Read more →</span>';
                } else {
                    excerpt = decodedText + ' <span style="color: var(--accent); font-weight: 500; margin-left: 5px;"> Read more →</span>';
                }
            } else {
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

    fetchAllBlogs();
});
