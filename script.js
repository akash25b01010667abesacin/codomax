document.addEventListener('DOMContentLoaded', () => {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const apiBaseUrl = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

  const setFeedback = (form, message, isError = false) => {
    const feedback = form.querySelector('.feedback');
    if (!feedback) {
      return;
    }

    feedback.textContent = message;
    feedback.style.color = isError ? '#b91c1c' : '#14532d';
  };

  const getFormPayload = (form) => Object.fromEntries(
    Array.from(form.querySelectorAll('input, textarea'))
      .filter((field) => field.name)
      .map((field) => [field.name, field.value.trim()])
  );

  const currentUser = JSON.parse(localStorage.getItem('blogNexusUser') || 'null');
  const greeting = document.querySelector('[data-user-greeting]');
  if (greeting && currentUser?.name) {
    greeting.textContent = `Welcome back, ${currentUser.name}`;
  }

  const blogList = document.getElementById('blog-list');
  const postCount = document.getElementById('post-count');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');

  let allBlogs = [];

  const renderBlogs = (blogsToRender) => {
    if (postCount) {
      postCount.textContent = String(blogsToRender.length);
    }

    blogList.innerHTML = blogsToRender.length
      ? blogsToRender.map((blog) => {
          const excerpt = (blog.content || '').slice(0, 180);
          return `
            <article class="list-card">
              <div class="blog-card-top">
                <div>
                  <h3>${blog.title}</h3>
                  <p>${blog.category} · ${new Date(blog.createdAt).toLocaleDateString()}</p>
                </div>
                <a class="blog-link" href="blog.html?id=${blog.id}">Read more</a>
              </div>
              <p>${excerpt}${(blog.content || '').length > 180 ? '…' : ''}</p>
            </article>
          `;
        }).join('')
      : '<article class="list-card"><h3>No matching posts found</h3><p>Try resetting your search or filters.</p></article>';
  };

  const applyFilters = () => {
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const selectedCategory = categoryFilter ? categoryFilter.value : '';

    const filtered = allBlogs.filter((blog) => {
      const matchesSearch = !searchTerm ||
        (blog.title || '').toLowerCase().includes(searchTerm) ||
        (blog.content || '').toLowerCase().includes(searchTerm) ||
        (blog.category || '').toLowerCase().includes(searchTerm);
      const matchesCategory = !selectedCategory || blog.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    renderBlogs(filtered);
  };

  const populateCategories = (blogs) => {
    if (!categoryFilter) return;
    const categories = Array.from(new Set(blogs.map((blog) => blog.category).filter(Boolean)));
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map((cat) => `<option value="${cat}">${cat}</option>`).join('');
  };

  const loadBlogs = async () => {
    if (!blogList) {
      return;
    }

    blogList.innerHTML = '<article class="list-card"><h3>Loading posts…</h3><p>Please wait while we fetch the latest content.</p></article>';

    try {
      const response = await fetch(`${apiBaseUrl}/api/blogs`);
      allBlogs = await response.json();
      if (!Array.isArray(allBlogs)) {
        throw new Error('Invalid blog response.');
      }

      populateCategories(allBlogs);
      renderBlogs(allBlogs);

      if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
      }
      if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
      }
    } catch (error) {
      console.error('Unable to load blogs', error);
      blogList.innerHTML = '<article class="list-card"><h3>Unable to load posts</h3><p>Make sure the server is running on port 3000.</p></article>';
    }
  };

  const loadBlogDetail = async () => {
    const detailContainer = document.getElementById('blog-detail');
    const blogTitle = document.getElementById('blog-title');
    const blogMeta = document.getElementById('blog-meta');
    const blogContent = document.getElementById('blog-content');
    const emptyState = document.getElementById('blog-empty');

    if (!detailContainer) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');

    if (!blogId) {
      if (emptyState) {
        emptyState.hidden = false;
      }
      detailContainer.hidden = true;
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/blogs/${blogId}`);
      const data = await response.json();
      if (!response.ok || !data.blog) {
        throw new Error(data.message || 'Blog not found.');
      }

      const blog = data.blog;
      if (blogTitle) {
        blogTitle.textContent = blog.title;
      }
      if (blogMeta) {
        blogMeta.textContent = `${blog.category} · ${new Date(blog.createdAt).toLocaleDateString()}`;
      }
      if (blogContent) {
        blogContent.textContent = blog.content;
      }
      detailContainer.hidden = false;
      if (emptyState) {
        emptyState.hidden = true;
      }

      const editBtn = document.getElementById('edit-blog-btn');
      const deleteBtn = document.getElementById('delete-blog-btn');

      if (editBtn) {
        editBtn.onclick = () => {
          window.location.href = `create-blog.html?id=${blog.id}`;
        };
      }

      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm('Are you sure you want to delete this blog post?')) {
            try {
              const res = await fetch(`${apiBaseUrl}/api/blogs/${blog.id}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                window.location.href = 'dashboard.html';
              } else {
                alert('Failed to delete blog.');
              }
            } catch (err) {
              console.error(err);
              alert('Error deleting blog.');
            }
          }
        };
      }
    } catch (error) {
      console.error('Unable to load blog detail', error);
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'This blog could not be loaded right now.';
      }
      detailContainer.hidden = true;
    }
  };

  // Adapter for Edit Mode on create-blog page
  const setupEditMode = () => {
    const params = new URLSearchParams(window.location.search);
    const editBlogId = params.get('id');
    const isEditMode = window.location.pathname.includes('create-blog.html') && editBlogId;

    if (isEditMode) {
      const form = document.getElementById('blog-form');
      if (form) {
        const heading = document.querySelector('.create-grid h1');
        if (heading) {
          heading.textContent = 'Edit your story.';
        }
        const eyebrow = document.querySelector('.create-grid .eyebrow');
        if (eyebrow) {
          eyebrow.textContent = 'Edit Mode';
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = 'Update post';
        }

        fetch(`${apiBaseUrl}/api/blogs/${editBlogId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.blog) {
              form.querySelector('[name="title"]').value = data.blog.title || '';
              form.querySelector('[name="category"]').value = data.blog.category || '';
              form.querySelector('[name="content"]').value = data.blog.content || '';
            }
          })
          .catch((err) => console.error('Error fetching blog for edit:', err));
      }
    }
  };

  loadBlogs();
  loadBlogDetail();
  setupEditMode();

  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const feedback = form.querySelector('.feedback');
      const isValid = Array.from(form.querySelectorAll('input, textarea')).every((field) => field.checkValidity());

      if (!isValid) {
        setFeedback(form, 'Please complete every required field.', true);
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton && !submitButton.dataset.originalText) {
        submitButton.dataset.originalText = submitButton.textContent;
      }
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait...';
      }

      try {
        const payload = getFormPayload(form);
        let endpoint = '';
        let method = 'POST';
        let successMessage = form.dataset.feedback || 'Submission received.';

        if (form.id === 'register-form') {
          endpoint = '/api/register';
        } else if (form.id === 'login-form') {
          endpoint = '/api/login';
        } else if (form.id === 'blog-form') {
          const editId = new URLSearchParams(window.location.search).get('id');
          if (editId) {
            endpoint = `/api/blogs/${editId}`;
            method = 'PUT';
            successMessage = 'Your blog has been updated successfully.';
          } else {
            endpoint = '/api/blogs';
            method = 'POST';
          }
        }

        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({ message: 'Request failed.' }));
        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong.');
        }

        if (form.id === 'login-form' || form.id === 'register-form') {
          localStorage.setItem('blogNexusUser', JSON.stringify(data.user));
          successMessage = data.message || successMessage;
          if (form.id === 'login-form') {
            window.location.href = 'dashboard.html';
            return;
          }
          window.location.href = 'login.html';
          return;
        }

        if (form.id === 'blog-form') {
          window.location.href = 'dashboard.html';
          return;
        }

        setFeedback(form, data.message || successMessage);
        form.reset();
      } catch (error) {
        setFeedback(form, error.message || 'Unable to complete your request.', true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
        }
      }
    });
  });
});
