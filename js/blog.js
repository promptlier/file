document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the blog slug from the URL Query String
    const urlParams = new URLSearchParams(window.location.search);
    const blogSlug = urlParams.get('slug');

    // 2. DOM Elements to populate
    const blogWrapper = document.getElementById('blogWrapper');
    const blogCoverImage = document.getElementById('blogCoverImage');
    const blogDate = document.getElementById('blogDate');
    const blogTitle = document.getElementById('blogTitle');
    const blogContent = document.getElementById('blogContent');
    const shareBtn = document.getElementById('shareBlogBtn');

    // If no slug is found, redirect home
    if (!blogSlug) {
        window.location.href = 'index.html';
        return;
    }

    async function loadBlogDetails() {
        // --- ⚡ INSTANT LOAD START (Zero CLS) ---
        const preloadedDataStr = localStorage.getItem('promptlier_current_blog_preload');
        let hasPreloaded = false;

        if (preloadedDataStr) {
            try {
                const preloadedData = JSON.parse(preloadedDataStr);

                // Ensure slug matches so we don't load old cache
                if (preloadedData.slug === blogSlug) {
                    renderBlogHeader(preloadedData);

                    // If the preloaded cache ACTUALLY has the body content 
                    // (because it came from the global.js interceptor, not just the index card)
                    // then inject it immediately for true zero-CLS!
                    if (preloadedData.body_content) {
                        blogContent.innerHTML = preloadedData.body_content;
                    }

                    hasPreloaded = true;
                }
            } catch (e) {
                console.error("Failed to parse blog preload data", e);
            }
        }

        // Show the UI immediately if we have header cache
        if (hasPreloaded) {
            blogWrapper.style.opacity = '1';
        } else {
            document.title = "Loading Article... | Promptlier Editorials";
            blogTitle.innerText = "Loading article...";
            blogWrapper.style.opacity = '1'; // Fade in loading state
        }

        // --- FETCH FULL CONTENT ---
        try {
            const { data, error } = await window.supabaseClient
                .from('blogs')
                .select('*')
                .eq('slug', blogSlug)
                .single();

            if (error) throw error;
            if (!data) {
                blogTitle.innerText = "Article not found.";
                blogContent.innerHTML = '<p style="text-align: center;">We could not find the article you are looking for.</p>';
                return;
            }

            // Render full data (overwriting cache just to be safe)
            renderBlogHeader(data);

            // Render the HTML body content from the fresh fetch
            if (data.body_content) {
                blogContent.innerHTML = data.body_content;
            } else {
                blogContent.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No content available for this article.</p>';
            }

            // Cleanup cache now that we are fully loaded and fresh
            localStorage.removeItem('promptlier_current_blog_preload');

        } catch (err) {
            console.error("Error loading blog details:", err);
            if (!hasPreloaded) {
                blogTitle.innerText = "Error loading article.";
                blogContent.innerHTML = '<p style="text-align: center; color: red;">A database error occurred.</p>';
            }
        }
    }

    function renderBlogHeader(data) {
        // dynamic SEO page title
        document.title = `${data.title} | Promptlier Editorials`;

        blogTitle.innerText = data.title;

        if (data.created_at) {
            const dateObj = new Date(data.created_at);
            blogDate.innerText = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        if (data.cover_image_url) {
            blogCoverImage.src = data.cover_image_url;
            blogCoverImage.alt = "Cover image for " + data.title;
            blogCoverImage.style.display = 'block';
        }

        // Dynamic Meta Tags (Best effort for Client Side SEO)
        const metaDesc = document.querySelector('meta[name="description"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');

        if (metaDesc && data.meta_desc) metaDesc.content = data.meta_desc;
        if (ogTitle) ogTitle.content = data.title;
        if (ogDesc && data.meta_desc) ogDesc.content = data.meta_desc;
        if (ogImage && data.cover_image_url) ogImage.content = data.cover_image_url;
    }

    // Share Button Logic
    if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const shareTitle = `${blogTitle.innerText} | Promptlier`;
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
                navigator.clipboard.writeText(shareUrl).then(() => {
                    const originalHTML = shareBtn.innerHTML;
                    shareBtn.innerHTML = '<span style="font-size: 0.9rem; font-weight: bold; margin-left: 8px;">Link Copied!</span>';
                    setTimeout(() => {
                        shareBtn.innerHTML = originalHTML;
                    }, 2000);
                });
            }
        });
    }

    // Start routine
    loadBlogDetails();
});
