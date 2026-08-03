const test = require('node:test');
const assert = require('node:assert/strict');
const { app, users, blogs } = require('./server');
const request = require('supertest');

test('registers a new user', async () => {
  users.length = 0;
  const response = await request(app)
    .post('/api/register')
    .send({ name: 'Ada', email: 'ada@example.com', password: 'secure123' });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, 'ada@example.com');
});

test('logs in an existing user', async () => {
  users.length = 0;
  users.push({ id: '1', name: 'Ada', email: 'ada@example.com', password: 'secure123' });

  const response = await request(app)
    .post('/api/login')
    .send({ email: 'ada@example.com', password: 'secure123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.name, 'Ada');
});

test('creates a blog post', async () => {
  blogs.length = 0;
  const response = await request(app)
    .post('/api/blogs')
    .send({ title: 'Hello', category: 'Tech', content: 'A sample post' });

  assert.equal(response.status, 201);
  assert.equal(response.body.blog.title, 'Hello');
});
