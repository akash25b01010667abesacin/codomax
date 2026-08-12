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
  const getAuthToken = () => localStorage.getItem('blogNexusToken');
  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('blogNexusToken', token);
    } else {
      localStorage.removeItem('blogNexusToken');
    }
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('blogNexusUser');
    window.location.href = 'login.html';
  };

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

  const profileName = document.getElementById('profile-name');
  if (profileName && currentUser?.name) {
    profileName.textContent = currentUser.name;
  }

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }

  const protectedPages = ['dashboard.html'];
  const currentPage = window.location.pathname.split('/').pop();
  const token = getAuthToken();

  if (protectedPages.includes(currentPage) && !token) {
    window.location.href = 'login.html';
    return;
  }

  const blogList = document.getElementById('blog-list');
  const postCount = document.getElementById('post-count');
  const searchInput = document.getElementById('blog-search');
  const categoryFilter = document.getElementById('blog-category-filter');

  async function loadBlogs() {
    if (!blogList) {
      return;
    }

    const params = new URLSearchParams();
    const searchValue = searchInput?.value.trim() || '';
    const categoryValue = categoryFilter?.value || '';

    if (searchValue) params.set('search', searchValue);
    if (categoryValue) params.set('category', categoryValue);

    blogList.innerHTML = '<article class="list-card"><h3>Loading posts…</h3><p>Please wait while we fetch the latest content.</p></article>';

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/blogs${params.toString() ? `?${params.toString()}` : ''}`, { headers });
      const blogs = await response.json();
      if (response.status === 401) {
        logout();
        return;
      }
      if (!Array.isArray(blogs)) {
        throw new Error('Invalid blog response.');
      }

      if (postCount) {
        postCount.textContent = String(blogs.length);
      }

      blogList.innerHTML = blogs.length
        ? blogs.map((blog) => {
            const excerpt = (blog.content || '').slice(0, 180);
            return `
              <article class="list-card">
                <div class="blog-card-top">
                  <div>
                    <h3>${blog.title}</h3>
                    <p>${blog.category} · ${new Date(blog.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div class="blog-actions">
                    <a class="blog-link" href="blog.html?id=${blog.id}">Read</a>
                    <a class="blog-link" href="create-blog.html?id=${blog.id}">Edit</a>
                    <button class="blog-delete" type="button" data-delete-id="${blog.id}">Delete</button>
                  </div>
                </div>
                <p>${excerpt}${(blog.content || '').length > 180 ? '…' : ''}</p>
              </article>
            `;
          }).join('')
        : '<article class="list-card"><h3>No posts yet</h3><p>Create your first blog post to see it here.</p></article>';

      blogList.querySelectorAll('[data-delete-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          const blogId = button.dataset.deleteId;
          const confirmed = window.confirm('Delete this blog?');
          if (!confirmed) {
            return;
          }

          try {
            const response = await fetch(`${apiBaseUrl}/api/blogs/${blogId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${getAuthToken()}`
              }
            });
            const data = await response.json().catch(() => ({ message: 'Unable to delete blog.' }));
            if (response.status === 401) {
              logout();
              return;
            }
            if (!response.ok) {
              throw new Error(data.message || 'Unable to delete blog.');
            }
            loadBlogs();
          } catch (error) {
            console.error('Unable to delete blog', error);
            window.alert(error.message || 'Unable to delete blog.');
          }
        });
      });
    } catch (error) {
      console.error('Unable to load blogs', error);
      blogList.innerHTML = '<article class="list-card"><h3>Unable to load posts</h3><p>Make sure the server is running on port 3000.</p></article>';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', loadBlogs);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', loadBlogs);
  }

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
      if (blogTitle) blogTitle.textContent = blog.title;
      if (blogMeta) blogMeta.textContent = `${blog.category} · ${new Date(blog.createdAt).toLocaleDateString()}`;
      if (blogContent) blogContent.textContent = blog.content;

      detailContainer.hidden = false;
      if (emptyState) emptyState.hidden = true;

      const editBtn = document.getElementById('edit-blog-btn');
      const deleteBtn = document.getElementById('delete-blog-btn');

      if (editBtn) {
        editBtn.onclick = () => {
          window.location.href = `create-blog.html?id=${blog.id}`;
        };
      }

      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          const confirmed = window.confirm('Delete this blog?');
          if (!confirmed) return;

          try {
            const response = await fetch(`${apiBaseUrl}/api/blogs/${blog.id}`, { method: 'DELETE' });
            const data = await response.json().catch(() => ({ message: 'Unable to delete blog.' }));
            if (!response.ok) {
              throw new Error(data.message || 'Unable to delete blog.');
            }
            window.location.href = 'dashboard.html';
          } catch (error) {
            console.error('Unable to delete blog', error);
            window.alert(error.message || 'Unable to delete blog.');
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

  const setupBlogForm = () => {
    const form = document.getElementById('blog-form');
    if (!form) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');
    const submitButton = form.querySelector('button[type="submit"]');

    if (blogId) {
      form.dataset.mode = 'edit';
      form.dataset.blogId = blogId;
      if (submitButton) {
        submitButton.textContent = 'Update post';
      }

      fetch(`${apiBaseUrl}/api/blogs/${blogId}`)
        .then((response) => response.json())
        .then((data) => {
          if (!data.blog) {
            return;
          }
          form.querySelector('[name="title"]').value = data.blog.title || '';
          form.querySelector('[name="category"]').value = data.blog.category || '';
          form.querySelector('[name="content"]').value = data.blog.content || '';
        })
        .catch((error) => {
          console.error('Unable to populate blog form', error);
        });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const isValid = Array.from(form.querySelectorAll('input, textarea')).every((field) => field.checkValidity());

      if (!isValid) {
        setFeedback(form, 'Please complete every required field.', true);
        return;
      }

      if (!getAuthToken()) {
        window.location.href = 'login.html';
        return;
      }

      if (submitButton && !submitButton.dataset.originalText) {
        submitButton.dataset.originalText = submitButton.textContent;
      }
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait...';
      }

      try {
        const payload = getFormPayload(form);
        const isEditMode = form.dataset.mode === 'edit' && form.dataset.blogId;
        const method = isEditMode ? 'PUT' : 'POST';
        const endpoint = isEditMode ? `/api/blogs/${form.dataset.blogId}` : '/api/blogs';

        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({ message: 'Request failed.' }));
        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong.');
        }

        window.location.href = 'dashboard.html';
      } catch (error) {
        setFeedback(form, error.message || 'Unable to complete your request.', true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitButton.dataset.originalText || submitButton.textContent;
        }
      }
    });
  };

  const setupAuthForms = () => {
    const forms = document.querySelectorAll('form:not(#blog-form)');
    forms.forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
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
          const successMessage = form.dataset.feedback || 'Submission received.';

          if (form.id === 'register-form') {
            endpoint = '/api/register';
          } else if (form.id === 'login-form') {
            endpoint = '/api/login';
          }

          const response = await fetch(`${apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await response.json().catch(() => ({ message: 'Request failed.' }));
          if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
          }

          if (form.id === 'login-form' || form.id === 'register-form') {
            if (data.token) {
              setAuthToken(data.token);
            }
            localStorage.setItem('blogNexusUser', JSON.stringify(data.user));
            if (form.id === 'login-form') {
              window.location.href = 'dashboard.html';
              return;
            }
            window.location.href = 'login.html';
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
  };

  if (document.getElementById('blog-list')) {
    loadBlogs();
  }

  if (document.getElementById('blog-detail')) {
    loadBlogDetail();
  }

  setupBlogForm();
  setupAuthForms();
});
