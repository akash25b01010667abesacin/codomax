const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, users, blogs } = require('./server');
const request = require('supertest');

const storePath = path.join(__dirname, 'data', 'store.json');

function resetStore() {
  users.length = 0;
  blogs.length = 0;
  fs.rmSync(storePath, { force: true });
}

function buildUser(email, password, name = 'Ada') {
  const salt = 'test-salt';
  const crypto = require('node:crypto');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { id: `${email}-id`, name, email, passwordSalt: salt, passwordHash: hash };
}

test.beforeEach(() => {
  resetStore();
});

test('registers a new user', async () => {
  const response = await request(app)
    .post('/api/register')
    .send({ name: 'Ada', email: 'ada@example.com', password: 'secure123' });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'ada@example.com');
});

test('logs in an existing user', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));

  const response = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.name, 'Ada');
  assert.ok(response.body.token);
});

test('creates a blog post', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));
  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  const response = await request(app)
    .post('/api/blogs')
    .set('Authorization', `Bearer ${loginResponse.body.token}`)
    .send({ title: 'Hello', category: 'Tech', content: 'A sample post' });

  assert.equal(response.status, 201);
  assert.equal(response.body.blog.title, 'Hello');
});

test('retrieves a blog by id', async () => {
  blogs.push({ id: 'blog-1', title: 'Hello', category: 'Tech', content: 'A sample post', createdAt: '2024-01-01T00:00:00.000Z' });

  const response = await request(app).get('/api/blogs/blog-1');

  assert.equal(response.status, 200);
  assert.equal(response.body.blog.id, 'blog-1');
});

test('updates an existing blog', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));
  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  blogs.push({
    id: 'blog-2',
    userId: 'ada@example.com-id',
    title: 'Original',
    category: 'Tech',
    content: 'Old body',
    createdAt: '2024-01-01T00:00:00.000Z'
  });

  const response = await request(app)
    .put('/api/blogs/blog-2')
    .set('Authorization', `Bearer ${loginResponse.body.token}`)
    .send({ title: 'Updated', category: 'Design', content: 'New body' });

  assert.equal(response.status, 200);
  assert.equal(response.body.blog.title, 'Updated');
  assert.equal(response.body.blog.category, 'Design');
});

test('deletes an existing blog', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));
  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  blogs.push({
    id: 'blog-3',
    userId: 'ada@example.com-id',
    title: 'Delete me',
    category: 'News',
    content: 'Body',
    createdAt: '2024-01-01T00:00:00.000Z'
  });

  const response = await request(app)
    .delete('/api/blogs/blog-3')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Blog deleted successfully.');
  assert.equal(blogs.some((blog) => blog.id === 'blog-3'), false);
});

test('returns only the authenticated user blogs', async () => {
  users.push(buildUser('alice@example.com', 'pass123', 'Alice'));
  users.push(buildUser('bob@example.com', 'pass456', 'Bob'));

  blogs.push(
    { id: 'blog-4', userId: 'alice@example.com-id', title: 'Alice Post', category: 'Tech', content: 'Alice blog', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'blog-5', userId: 'bob@example.com-id', title: 'Bob Post', category: 'Design', content: 'Bob blog', createdAt: '2024-01-01T00:00:00.000Z' }
  );

  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'alice@example.com', password: 'pass123' });

  const response = await request(app)
    .get('/api/blogs')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].userId, 'alice@example.com-id');
});

test('filters blogs by search term and category', async () => {
  blogs.push(
    { id: 'blog-4', title: 'React Patterns', category: 'Tech', content: 'Deep dive into component design', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'blog-5', title: 'Design Systems', category: 'Design', content: 'A guide to making UI feel consistent', createdAt: '2024-01-01T00:00:00.000Z' }
  );

  const response = await request(app).get('/api/blogs?search=design&category=Tech');

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, 'blog-4');
});

test('updates a blog post', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));
  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  blogs.push({
    id: 'blog-1',
    userId: 'ada@example.com-id',
    title: 'Hello',
    category: 'Tech',
    content: 'A sample post',
    createdAt: '2024-01-01T00:00:00.000Z'
  });

  const response = await request(app)
    .put('/api/blogs/blog-1')
    .set('Authorization', `Bearer ${loginResponse.body.token}`)
    .send({ title: 'Hello Updated', category: 'Tech Updated', content: 'Updated content' });

  assert.equal(response.status, 200);
  assert.equal(response.body.blog.title, 'Hello Updated');
  assert.equal(response.body.blog.category, 'Tech Updated');
  assert.equal(response.body.blog.content, 'Updated content');
});

test('deletes a blog post', async () => {
  users.push(buildUser('ada@example.com', 'secure123', 'Ada'));
  const loginResponse = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  blogs.push({
    id: 'blog-1',
    userId: 'ada@example.com-id',
    title: 'Hello',
    category: 'Tech',
    content: 'A sample post',
    createdAt: '2024-01-01T00:00:00.000Z'
  });

  const response = await request(app)
    .delete('/api/blogs/blog-1')
    .set('Authorization', `Bearer ${loginResponse.body.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.blog.id, 'blog-1');
  assert.equal(blogs.length, 0);
});
