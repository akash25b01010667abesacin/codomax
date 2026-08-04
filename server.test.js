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
  users.push({ id: '1', name: 'Ada', email: 'ada@example.com', password: 'secure123' });

  const response = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.name, 'Ada');
});

test('creates a blog post', async () => {
  const response = await request(app)
    .post('/api/blogs')
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
