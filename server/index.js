const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../openai-apikey.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../atlas-credentials.env') });

const express = require('express');
const mongoose = require('mongoose');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/reviews', reviewsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');

  app.listen(PORT, () => {
    console.log(`Whiskana server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});
