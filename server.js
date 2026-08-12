const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let MongoClient;
try {
  ({ MongoClient } = require('mongodb'));
} catch (error) {
  MongoClient = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const dataDir = path.join(__dirname, 'data');
const dataFilePath = path.join(dataDir, 'store.json');

const users = [];
const blogs = [];

let mongoDb = null;
let storeMode = 'file';
let initialized = false;

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function saveStore() {
  ensureDataDir();
  fs.writeFileSync(dataFilePath, JSON.stringify({ users, blogs }, null, 2));

  if (storeMode === 'mongo' && mongoDb) {
    const usersCollection = mongoDb.collection('users');
    const blogsCollection = mongoDb.collection('blogs');

    Promise.all([
      usersCollection.deleteMany({}),
      blogsCollection.deleteMany({})
    ])
      .then(() => Promise.all([
        users.length ? usersCollection.insertMany(users) : Promise.resolve(),
        blogs.length ? blogsCollection.insertMany(blogs) : Promise.resolve()
      ]))
      .catch((error) => {
        console.warn('Unable to sync data to MongoDB:', error.message);
      });
  }
}

function loadStore() {
  ensureDataDir();
  if (!fs.existsSync(dataFilePath)) {
    saveStore();
    return;
  }

  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    users.splice(0, users.length, ...(Array.isArray(parsed.users) ? parsed.users : []));
    blogs.splice(0, blogs.length, ...(Array.isArray(parsed.blogs) ? parsed.blogs : []));
  } catch (error) {
    users.splice(0, users.length);
    blogs.splice(0, blogs.length);
    saveStore();
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, storedSalt, storedHash) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'codomax-dev-secret',
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'codomax-dev-secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

async function initializeStore() {
  if (initialized) {
    return;
  }

  initialized = true;

  if (process.env.NODE_ENV === 'test') {
    users.splice(0, users.length);
    blogs.splice(0, blogs.length);
    return;
  }

  if (process.env.MONGODB_URI && MongoClient) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      mongoDb = client.db(process.env.MONGODB_DB || 'codomax');
      storeMode = 'mongo';

      const [mongoUsers, mongoBlogs] = await Promise.all([
        mongoDb.collection('users').find({}).toArray(),
        mongoDb.collection('blogs').find({}).toArray()
      ]);

      users.splice(0, users.length, ...mongoUsers);
      blogs.splice(0, blogs.length, ...mongoBlogs);
      return;
    } catch (error) {
      console.warn('MongoDB unavailable, falling back to file storage:', error.message);
    }
  }

  loadStore();
}

app.get('/api/health', async (req, res) => {
  await initializeStore();
  res.json({ ok: true, message: 'BlogNexus backend is running' });
});

app.post('/api/register', async (req, res) => {
  await initializeStore();

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists.' });
  }

  const { salt, hash } = hashPassword(password);
  const user = { id: Date.now().toString(), name, email, passwordSalt: salt, passwordHash: hash };
  users.push(user);
  saveStore();

  const token = signToken(user);
  res.status(201).json({
    message: 'User registered successfully.',
    token,
    user: { id: user.id, name, email }
  });
});

app.post('/api/login', async (req, res) => {
  await initializeStore();

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((entry) => entry.email === email);
  const isValidPassword = user && (
    (user.passwordHash && user.passwordSalt && verifyPassword(password, user.passwordSalt, user.passwordHash)) ||
    user.password === password
  );

  if (!user || !isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = signToken(user);
  res.json({
    message: 'Login successful.',
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.get('/api/me', authenticateToken, async (req, res) => {
  await initializeStore();
  const user = users.find((entry) => entry.id === req.user.id || entry.email === req.user.email);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post('/api/blogs', authenticateToken, async (req, res) => {
  await initializeStore();

  const { title, category, content } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ message: 'Title, category, and content are required.' });
  }

  const blog = {
    id: Date.now().toString(),
    userId: req.user.id,
    title,
    category,
    content,
    createdAt: new Date().toISOString()
  };

  blogs.push(blog);
  saveStore();
  res.status(201).json({ message: 'Blog created successfully.', blog });
});

app.get('/api/blogs', async (req, res) => {
  await initializeStore();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let currentUser = null;

  if (token) {
    try {
      currentUser = jwt.verify(token, process.env.JWT_SECRET || 'codomax-dev-secret');
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  }

  const search = (req.query.search || '').toString().trim().toLowerCase();
  const category = (req.query.category || '').toString().trim().toLowerCase();

  let filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = !search || [blog.title, blog.category, blog.content].some((value) =>
      (value || '').toString().toLowerCase().includes(search)
    );
    const matchesCategory = !category || (blog.category || '').toString().toLowerCase() === category;

    return matchesSearch && matchesCategory;
  });

  if (currentUser) {
    filteredBlogs = filteredBlogs.filter((blog) => blog.userId === currentUser.id);
  }

  const sortedBlogs = filteredBlogs.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  res.json(sortedBlogs);
});

app.get('/api/blogs/:id', async (req, res) => {
  await initializeStore();
  const blog = blogs.find((entry) => entry.id === req.params.id);

  if (!blog) {
    return res.status(404).json({ message: 'Blog not found.' });
  }

  res.json({ blog });
});

app.put('/api/blogs/:id', authenticateToken, async (req, res) => {
  await initializeStore();
  const blogIndex = blogs.findIndex((entry) => entry.id === req.params.id);

  if (blogIndex === -1) {
    return res.status(404).json({ message: 'Blog not found.' });
  }

  const blog = blogs[blogIndex];
  if (blog.userId !== req.user.id) {
    return res.status(403).json({ message: 'You can only update your own blogs.' });
  }

  const { title, category, content } = req.body;

  if (!title || !category || !content) {
    return res.status(400).json({ message: 'Title, category, and content are required.' });
  }

  blogs[blogIndex] = {
    ...blog,
    title,
    category,
    content,
    updatedAt: new Date().toISOString()
  };

  saveStore();
  res.json({ message: 'Blog updated successfully.', blog: blogs[blogIndex] });
});

app.delete('/api/blogs/:id', authenticateToken, async (req, res) => {
  await initializeStore();
  const blogIndex = blogs.findIndex((entry) => entry.id === req.params.id);

  if (blogIndex === -1) {
    return res.status(404).json({ message: 'Blog not found.' });
  }

  const blog = blogs[blogIndex];
  if (blog.userId !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own blogs.' });
  }

  const deletedBlog = blogs.splice(blogIndex, 1)[0];
  saveStore();
  res.json({ message: 'Blog deleted successfully.', blog: deletedBlog });
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
