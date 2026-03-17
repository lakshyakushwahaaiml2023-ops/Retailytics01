# Retailytics

Retailytics is a modern retail analytics and storefront platform built with Next.js, React, and Prisma. This guide will walk you through running the project locally after cloning the repository.

## Features
- Real-time business analytics dashboard
- Customer storefront and messaging
- AI-powered chat agent
- Multi-store product comparison
- Voice agent integration (Twilio, Vapi.ai, 11labs)

---

## Getting Started

### 1. Clone the Repository
```
git clone https://github.com/lakshyakushwahaaiml2023-ops/Retailytics.git
cd Retailytics
```

### 2. Install Dependencies
```
npm install
```

### 3. Set Up the Database
Retailytics uses SQLite via Prisma.

- The default database file is `dev.db` (already included for demo).
- To reset or seed demo data:
```
npm run prisma:seed
```
- To apply migrations (if needed):
```
npx prisma migrate dev
```

### 4. Configure Environment Variables
Create a `.env.local` file in the project root. Example:
```
DATABASE_URL="file:./dev.db"
# Add any API keys or secrets needed for Twilio, Vapi.ai, etc.
```

### 5. Run the Development Server
```
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

### Deploying to Vercel (Recommended)
1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and sign up/log in.
3. Import your Retailytics repo and click Deploy.
4. Add any required environment variables in the Vercel dashboard.

### Other Platforms
You can also deploy to Netlify, Render, or any platform supporting Next.js.

---

## Additional Notes
- For voice/AI features, set up Twilio, Vapi.ai, and 11labs credentials in `.env.local`.
- To seed demo products in multiple stores, use the provided seed scripts in the `prisma/` folder.
- All API routes are in `app/api/`.
- For customizations, edit components in `components/` and pages in `app/`.

---

## Troubleshooting
- If you see database errors, check your `DATABASE_URL` in `.env.local`.
- For dependency issues, run `npm install` again.
- For deployment errors, verify environment variables and build logs.

---

## License
MIT

---

## Contact
For questions or support, open an issue in the GitHub repo.
