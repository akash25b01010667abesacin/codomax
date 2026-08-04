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

  const loadBlogs = async () => {
    if (!blogList) {
      return;
    }

    blogList.innerHTML = '<article class="list-card"><h3>Loading posts…</h3><p>Please wait while we fetch the latest content.</p></article>';

    try {
      const response = await fetch(`${apiBaseUrl}/api/blogs`);
      const blogs = await response.json();
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
                  <a class="blog-link" href="blog.html?id=${blog.id}">Read more</a>
                </div>
                <p>${excerpt}${(blog.content || '').length > 180 ? '…' : ''}</p>
              </article>
            `;
          }).join('')
        : '<article class="list-card"><h3>No posts yet</h3><p>Create your first blog post to see it here.</p></article>';
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
    } catch (error) {
      console.error('Unable to load blog detail', error);
      if (emptyState) {
        emptyState.hidden = false;
        emptyState.textContent = 'This blog could not be loaded right now.';
      }
      detailContainer.hidden = true;
    }
  };

  loadBlogs();
  loadBlogDetail();

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
        let successMessage = form.dataset.feedback || 'Submission received.';

        if (form.id === 'register-form') {
          endpoint = '/api/register';
        } else if (form.id === 'login-form') {
          endpoint = '/api/login';
        } else if (form.id === 'blog-form') {
          endpoint = '/api/blogs';
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
