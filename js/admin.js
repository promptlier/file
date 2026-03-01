document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // GLOBAL STATE (Stores data locally for instant editing)
  // ==========================================

  const supabaseUrl = 'https://hrhuavgjvztlhtkgwwjz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyaHVhdmdqdnp0bGh0a2d3d2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNjYzNTEsImV4cCI6MjA4Nzg0MjM1MX0.PViLYSTAHZZidMpNoUjPHDJSCuZeHlCiCcegmFjauPQ';
  
  // This creates the active connection for this specific file!
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  window.allPrompts = [];
  window.allArticles = [];

  // ==========================================
  // 1. FETCH & DISPLAY DATA (READ)
  // ==========================================
  
  // Fetch Prompts
  async function fetchPrompts() {
    const tbody = document.getElementById('promptsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading prompts...</td></tr>';
    
    const { data, error } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error loading prompts.</td></tr>';
      return;
    }

    window.allPrompts = data; // Save to global state
    tbody.innerHTML = ''; // Clear table
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No prompts found. Add one!</td></tr>';
      return;
    }

    data.forEach(prompt => {
      tbody.innerHTML += `
        <tr>
          <td><img src="${prompt.image_url}" class="item-thumb" alt="thumb"></td>
          <td><strong>${prompt.title}</strong></td>
          <td>${prompt.category}</td>
          <td>${new Date(prompt.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn btn-edit" onclick="editPrompt('${prompt.id}')">Edit</button>
            <button class="action-btn btn-delete" onclick="deletePrompt('${prompt.id}')">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  // Fetch Articles
  async function fetchArticles() {
    const tbody = document.getElementById('articlesTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading articles...</td></tr>';
    
    const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    
    if (error) {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error loading articles.</td></tr>';
      return;
    }

    window.allArticles = data; // Save to global state
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No articles found. Write one!</td></tr>';
      return;
    }

    data.forEach(article => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${article.title}</strong></td>
          <td>/${article.slug}</td>
          <td>${new Date(article.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn btn-edit" onclick="editArticle('${article.id}')">Edit</button>
            <button class="action-btn btn-delete" onclick="deleteArticle('${article.id}')">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  // Fetch data when the page loads
  fetchPrompts();
  fetchArticles();

  // Also fetch when tabs are clicked to ensure fresh data
  document.getElementById('loadPromptsBtn')?.addEventListener('click', fetchPrompts);
  document.getElementById('loadArticlesBtn')?.addEventListener('click', fetchArticles);


  // ==========================================
  // 2. CREATE & UPDATE LOGIC (PROMPTS)
  // ==========================================
  const savePromptBtn = document.getElementById('savePromptBtn');
  const cancelPromptBtn = document.getElementById('cancelPromptEditBtn');

  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', async () => {
      const id = document.getElementById('editPromptId').value; // Hidden ID
      const imageFile = document.getElementById('promptImage').files[0];
      const title = document.getElementById('promptTitle').value;
      const category = document.getElementById('promptCategory').value;
      const model = document.getElementById('promptModel').value;
      const promptText = document.getElementById('promptText').value;

      // If creating NEW, image is required. If EDITING, image is optional.
      if (!title || !category || !model || !promptText || (!id && !imageFile)) {
        alert("Please fill in all fields (Image is required for new prompts).");
        return;
      }

      try {
        savePromptBtn.innerText = "Saving...";
        savePromptBtn.disabled = true;

        let finalImageUrl = null;

        // 1. Upload new image ONLY if user selected one
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `prompts/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('prompt-media').upload(filePath, imageFile);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('prompt-media').getPublicUrl(filePath);
          finalImageUrl = publicUrlData.publicUrl;
        }

        // 2. Build the data object
        const promptData = { title, category, model, prompt_text: promptText };
        if (finalImageUrl) promptData.image_url = finalImageUrl; // Only update image if a new one was uploaded

        // 3. Insert OR Update based on hidden ID
        if (id) {
          // UPDATE EXISTING
          const { error: updateError } = await supabase.from('prompts').update(promptData).eq('id', id);
          if (updateError) throw updateError;
          alert("Success! Prompt updated.");
        } else {
          // CREATE NEW
          const { error: insertError } = await supabase.from('prompts').insert([promptData]);
          if (insertError) throw insertError;
          alert("Success! Prompt published.");
        }

        // 4. Reset form & refresh table
        resetPromptForm();
        fetchPrompts();
        
      } catch (error) {
        console.error("Error saving prompt:", error);
        alert("Error: " + error.message);
      } finally {
        savePromptBtn.innerText = "Publish New Prompt";
        savePromptBtn.disabled = false;
      }
    });
  }

  // ==========================================
  // 3. EDIT & DELETE LOGIC (PROMPTS)
  // ==========================================
  window.editPrompt = function(id) {
    const prompt = window.allPrompts.find(p => p.id === id);
    if (!prompt) return;

    // Fill the form
    document.getElementById('editPromptId').value = prompt.id;
    document.getElementById('promptTitle').value = prompt.title;
    document.getElementById('promptCategory').value = prompt.category;
    document.getElementById('promptModel').value = prompt.model;
    document.getElementById('promptText').value = prompt.prompt_text;
    
    // Change UI state
    document.getElementById('savePromptBtn').innerText = "Update Prompt";
    document.getElementById('cancelPromptEditBtn').style.display = "block";

    // Switch to Add Tab visually
    document.querySelector('.tab-btn[data-target="promptForm"]').click();
  };

  window.deletePrompt = async function(id) {
    if(!confirm("Are you sure you want to permanently delete this prompt?")) return;
    
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (error) {
      alert("Error deleting prompt: " + error.message);
    } else {
      fetchPrompts(); // Refresh table
    }
  };

  function resetPromptForm() {
    document.getElementById('promptForm').reset();
    document.getElementById('editPromptId').value = '';
    document.getElementById('savePromptBtn').innerText = "Publish New Prompt";
    document.getElementById('cancelPromptEditBtn').style.display = "none";
  }

  if (cancelPromptBtn) cancelPromptBtn.addEventListener('click', resetPromptForm);


  // ==========================================
  // 4. THE EXACT SAME LOGIC FOR ARTICLES...
  // ==========================================
  const saveArticleBtn = document.getElementById('saveArticleBtn');
  const cancelArticleBtn = document.getElementById('cancelArticleEditBtn');

  if (saveArticleBtn) {
    saveArticleBtn.addEventListener('click', async () => {
      const id = document.getElementById('editArticleId').value;
      const coverFile = document.getElementById('articleCover').files[0];
      const title = document.getElementById('articleTitle').value;
      const slug = document.getElementById('articleSlug').value;
      const metaDesc = document.getElementById('articleMeta').value;
      
      const bodyContent = window.isHtmlMode 
        ? document.getElementById('rawHtmlEditor').value 
        : document.querySelector('.ql-editor').innerHTML;

      if (!title || !slug || !metaDesc || !bodyContent || bodyContent === '<p><br></p>' || (!id && !coverFile)) {
        alert("Please fill in all fields (Cover image is required for new articles).");
        return;
      }

      try {
        saveArticleBtn.innerText = "Saving...";
        saveArticleBtn.disabled = true;

        let finalCoverUrl = null;

        if (coverFile) {
          const fileExt = coverFile.name.split('.').pop();
          const fileName = `blogs/${Date.now()}-${slug}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('prompt-media').upload(fileName, coverFile);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('prompt-media').getPublicUrl(fileName);
          finalCoverUrl = publicUrlData.publicUrl;
        }

        const articleData = { title, slug, meta_desc: metaDesc, body_content: bodyContent };
        if (finalCoverUrl) articleData.cover_image_url = finalCoverUrl;

        if (id) {
          const { error: updateError } = await supabase.from('blogs').update(articleData).eq('id', id);
          if (updateError) throw updateError;
          alert("Success! Article updated.");
        } else {
          const { error: insertError } = await supabase.from('blogs').insert([articleData]);
          if (insertError) throw insertError;
          alert("Success! Article published.");
        }

        resetArticleForm();
        fetchArticles();
        
      } catch (error) {
        console.error("Error saving article:", error);
        alert("Error: " + error.message);
      } finally {
        saveArticleBtn.innerText = "Publish New Article";
        saveArticleBtn.disabled = false;
      }
    });
  }

  window.editArticle = function(id) {
    const article = window.allArticles.find(a => a.id === id);
    if (!article) return;

    document.getElementById('editArticleId').value = article.id;
    document.getElementById('articleTitle').value = article.title;
    document.getElementById('articleSlug').value = article.slug;
    document.getElementById('articleMeta').value = article.meta_desc;
    
    // Fill the Quill Editor & Raw HTML editor
    document.querySelector('.ql-editor').innerHTML = article.body_content;
    document.getElementById('rawHtmlEditor').value = article.body_content;

    document.getElementById('saveArticleBtn').innerText = "Update Article";
    document.getElementById('cancelArticleEditBtn').style.display = "block";

    document.querySelector('.tab-btn[data-target="articleForm"]').click();
  };

  window.deleteArticle = async function(id) {
    if(!confirm("Are you sure you want to permanently delete this article?")) return;
    
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) {
      alert("Error deleting article: " + error.message);
    } else {
      fetchArticles();
    }
  };

  function resetArticleForm() {
    document.getElementById('articleForm').reset();
    document.getElementById('editArticleId').value = '';
    document.querySelector('.ql-editor').innerHTML = '';
    document.getElementById('rawHtmlEditor').value = '';
    document.getElementById('saveArticleBtn').innerText = "Publish New Article";
    document.getElementById('cancelArticleEditBtn').style.display = "none";
  }

  if (cancelArticleBtn) cancelArticleBtn.addEventListener('click', resetArticleForm);

});