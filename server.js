const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const users = [];
const blogs = [];

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'BlogNexus backend is running' });
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const user = { id: Date.now().toString(), name, email, password };
  users.push(user);

  res.status(201).json({ message: 'User registered successfully.', user: { id: user.id, name, email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((entry) => entry.email === email && entry.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/blogs', (req, res) => {
  const { title, category, content } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ message: 'Title, category, and content are required.' });
  }

  const blog = {
    id: Date.now().toString(),
    title,
    category,
    content,
    createdAt: new Date().toISOString()
  };

  blogs.push(blog);
  res.status(201).json({ message: 'Blog created successfully.', blog });
});

app.get('/api/blogs', (req, res) => {
  res.json(blogs);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = { app, users, blogs };
