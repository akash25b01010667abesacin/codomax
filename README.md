# BlogNexus

BlogNexus is a full stack blog application built with Node.js, Express, and vanilla JavaScript. It includes user authentication, protected dashboard access, blog CRUD functionality, search/filtering, and a responsive UI for desktop and mobile screens.

## Features

- User registration and login
- JWT-based authentication
- Protected dashboard and create-blog routes
- Blog creation, editing, and deletion
- Search and category filtering
- User-specific dashboard content
- Responsive layout for mobile and desktop
- File-based data persistence with JSON storage

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Authentication: JWT
- Testing: Node.js built-in test runner + Supertest

## Project Structure

- `server.js` – Express server and API routes
- `script.js` – Frontend logic for UI, auth, and blog interactions
- `index.html` – Landing page
- `dashboard.html` – User dashboard
- `create-blog.html` – Create/edit blog form
- `login.html` – Login page
- `register.html` – Registration page
- `blog.html` – Blog detail page
- `styles.css` – Application styling
- `data/store.json` – Persisted app data
- `server.test.js` – Regression and API tests

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Open the app in your browser:
   ```text
   http://localhost:3000
   ```

## Available Scripts

```bash
npm start
npm test
```

## Authentication Notes

- Register a new user or sign in with an existing account.
- A JWT token is stored in localStorage after login/register.
- The dashboard and create-blog page require a valid token.
- Each user can only view, update, and delete their own blog posts.

## Deployment

This project is set up for static hosting with a Node backend and can be deployed to a host that supports Express apps, such as Render, Railway, Vercel with a serverless wrapper, or a traditional Node hosting provider.

## License

This project is for educational and portfolio use.
