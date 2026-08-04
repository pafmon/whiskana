const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const { File } = require('buffer');
const Review = require('../models/Review');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toISOString().slice(0, 10);
}

function getDemoReviews() {
  return [
    {
      id: 'demo-scotland-01',
      date: '2026-07-10',
      time: '20:00',
      distillery: 'Ardbeg',
      whiskyName: 'Ardbeg 10',
      year: '10',
      abv: '46',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Humo intenso, sal marina y limón.',
      palate: 'Pico de pimienta, fruta madura y madera.',
      finish: 'Largo, ahumado y muy persistente.',
      overall: 'Una cata muy potente y muy islay.',
      score: 90,
      price: '62 €',
      place: 'Port Ellen',
      transcript: 'Ardbeg 10 con humo intenso y notas salinas.',
      tags: ['ahumado', 'islay', 'marino'],
      latitude: 55.6330,
      longitude: -6.1912,
      createdAt: new Date('2026-07-10T20:00:00Z'),
      updatedAt: new Date('2026-07-10T20:00:00Z')
    },
    {
      id: 'demo-scotland-02',
      date: '2026-07-11',
      time: '19:30',
      distillery: 'Lagavulin',
      whiskyName: 'Lagavulin 16',
      year: '16',
      abv: '43',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Madera quemada, sal y fruta oscura.',
      palate: 'Vainilla, clavo y un toque de cítrico.',
      finish: 'Muy largo y amable.',
      overall: 'Clásico, profundo y muy equilibrado.',
      score: 92,
      price: '70 €',
      place: 'Bowmore',
      transcript: 'Lagavulin 16 con aroma ahumado y final largo.',
      tags: ['clásico', 'ahumado', 'islay'],
      latitude: 55.7560,
      longitude: -6.2880,
      createdAt: new Date('2026-07-11T19:30:00Z'),
      updatedAt: new Date('2026-07-11T19:30:00Z')
    },
    {
      id: 'demo-scotland-03',
      date: '2026-07-12',
      time: '21:15',
      distillery: 'Talisker',
      whiskyName: 'Talisker Storm',
      year: '10',
      abv: '45.8',
      type: 'Single Malt',
      region: 'Islands',
      nose: 'Pimienta negra, sal marina y lima.',
      palate: 'Picante, cítrico y con miel.',
      finish: 'Largo y especiado.',
      overall: 'Muy vivo y con carácter.',
      score: 88,
      price: '58 €',
      place: 'Skye',
      transcript: 'Talisker Storm con un perfil picante y marítimo.',
      tags: ['picante', 'marítimo', 'skye'],
      latitude: 57.2894,
      longitude: -6.2235,
      createdAt: new Date('2026-07-12T21:15:00Z'),
      updatedAt: new Date('2026-07-12T21:15:00Z')
    },
    {
      id: 'demo-scotland-04',
      date: '2026-07-14',
      time: '20:30',
      distillery: 'Glenmorangie',
      whiskyName: 'Glenmorangie Lasanta',
      year: '12',
      abv: '46',
      type: 'Single Malt',
      region: 'Highlands',
      nose: 'Naranja, miel y madera.',
      palate: 'Dulce, especiado y muy limpio.',
      finish: 'Medio y elegante.',
      overall: 'Más accesible y muy agradable.',
      score: 84,
      price: '51 €',
      place: 'Tain',
      transcript: 'Glenmorangie Lasanta con naranja madura y miel.',
      tags: ['dulce', 'afrutado', 'highlands'],
      latitude: 57.8090,
      longitude: -4.0550,
      createdAt: new Date('2026-07-14T20:30:00Z'),
      updatedAt: new Date('2026-07-14T20:30:00Z')
    },
    {
      id: 'demo-scotland-05',
      date: '2026-07-15',
      time: '19:45',
      distillery: 'The Glenlivet',
      whiskyName: 'The Glenlivet 12',
      year: '12',
      abv: '40',
      type: 'Single Malt',
      region: 'Speyside',
      nose: 'Manzana, pera y flores blancas.',
      palate: 'Suave y con miel ligera.',
      finish: 'Corta y elegante.',
      overall: 'Muy redondo y fácil de disfrutar.',
      score: 82,
      price: '44 €',
      place: 'Ballindalloch',
      transcript: 'The Glenlivet 12 con notas afrutadas y suave.',
      tags: ['afrutado', 'equilibrado', 'speyside'],
      latitude: 57.3500,
      longitude: -3.2000,
      createdAt: new Date('2026-07-15T19:45:00Z'),
      updatedAt: new Date('2026-07-15T19:45:00Z')
    },
    {
      id: 'demo-scotland-06',
      date: '2026-07-17',
      time: '21:00',
      distillery: 'Bowmore',
      whiskyName: 'Bowmore 12',
      year: '12',
      abv: '40',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Humo suave, algas y fruta.',
      palate: 'Madera, sal y un toque de tomate seco.',
      finish: 'Media y con profundidad.',
      overall: 'Muy elegante y con personalidad.',
      score: 86,
      price: '56 €',
      place: 'Bowmore',
      transcript: 'Bowmore 12 con humo cuidado y perfil marino.',
      tags: ['marino', 'elegante', 'islay'],
      latitude: 55.7580,
      longitude: -6.2870,
      createdAt: new Date('2026-07-17T21:00:00Z'),
      updatedAt: new Date('2026-07-17T21:00:00Z')
    },
    {
      id: 'demo-scotland-07',
      date: '2026-07-19',
      time: '18:45',
      distillery: 'Macallan',
      whiskyName: 'Macallan 12',
      year: '12',
      abv: '40',
      type: 'Single Malt',
      region: 'Highlands',
      nose: 'Vainilla, fruta madura y caramelo.',
      palate: 'Suave, cremoso y con toffee.',
      finish: 'Larga y amable.',
      overall: 'Muy redondo y fácil de disfrutar.',
      score: 88,
      price: '66 €',
      place: 'Craigellachie',
      transcript: 'Macallan 12 muy cremoso y con perfil dulce.',
      tags: ['cremoso', 'vainilla', 'highlands'],
      latitude: 57.4720,
      longitude: -3.1290,
      createdAt: new Date('2026-07-19T18:45:00Z'),
      updatedAt: new Date('2026-07-19T18:45:00Z')
    },
    {
      id: 'demo-scotland-08',
      date: '2026-07-21',
      time: '20:15',
      distillery: 'Springbank',
      whiskyName: 'Springbank 10',
      year: '10',
      abv: '46',
      type: 'Single Malt',
      region: 'Campbeltown',
      nose: 'Fruta cítrica, sal y aceite.',
      palate: 'Peculiar, con tierra y especias.',
      finish: 'Muy persistente.',
      overall: 'Una cata muy diferente.',
      score: 85,
      price: '63 €',
      place: 'Campbeltown',
      transcript: 'Springbank 10 con personalidad salina.',
      tags: ['salino', 'campbeltown', 'diferente'],
      latitude: 55.4240,
      longitude: -5.6060,
      createdAt: new Date('2026-07-21T20:15:00Z'),
      updatedAt: new Date('2026-07-21T20:15:00Z')
    },
    {
      id: 'demo-scotland-09',
      date: '2026-07-24',
      time: '19:00',
      distillery: 'Highland Park',
      whiskyName: 'Highland Park 12',
      year: '12',
      abv: '40',
      type: 'Single Malt',
      region: 'Islands',
      nose: 'Miel, nuez y un leve toque de turba.',
      palate: 'Especiado y con fruta roja.',
      finish: 'Ligeramente ahumado y limpio.',
      overall: 'Muy elegante y bien redondeado.',
      score: 83,
      price: '49 €',
      place: 'Kirkwall',
      transcript: 'Highland Park 12 con nuez y fruta roja.',
      tags: ['nuez', 'elegante', 'islands'],
      latitude: 58.9800,
      longitude: -2.9600,
      createdAt: new Date('2026-07-24T19:00:00Z'),
      updatedAt: new Date('2026-07-24T19:00:00Z')
    },
    {
      id: 'demo-scotland-10',
      date: '2026-07-26',
      time: '21:30',
      distillery: 'Laphroaig',
      whiskyName: 'Laphroaig 10',
      year: '10',
      abv: '48',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Humo intenso, sal y yodo.',
      palate: 'Medicinal y con madera.',
      finish: 'Largo, potente y marcado.',
      overall: 'Muy intenso y muy islay.',
      score: 90,
      price: '61 €',
      place: 'Port Ellen',
      transcript: 'Laphroaig 10 con humo intenso y perfil medicinal.',
      tags: ['humo', 'medicinal', 'islay'],
      latitude: 55.6320,
      longitude: -6.1900,
      createdAt: new Date('2026-07-26T21:30:00Z'),
      updatedAt: new Date('2026-07-26T21:30:00Z')
    },
    {
      id: 'demo-scotland-11',
      date: '2026-07-28',
      time: '19:15',
      distillery: 'Glenfiddich',
      whiskyName: 'Glenfiddich 15',
      year: '15',
      abv: '40',
      type: 'Single Malt',
      region: 'Speyside',
      nose: 'Manzana, miel y flor.',
      palate: 'Suave, afrutado y con vainilla.',
      finish: 'Limpia y agradable.',
      overall: 'Gran opción para una cata relajada.',
      score: 81,
      price: '39 €',
      place: 'Dufftown',
      transcript: 'Glenfiddich 15 con notas de manzana y miel.',
      tags: ['frutal', 'suave', 'speyside'],
      latitude: 57.4450,
      longitude: -3.1290,
      createdAt: new Date('2026-07-28T19:15:00Z'),
      updatedAt: new Date('2026-07-28T19:15:00Z')
    },
    {
      id: 'demo-scotland-12',
      date: '2026-07-30',
      time: '20:45',
      distillery: 'Bruichladdich',
      whiskyName: 'Bruichladdich Classic Laddie',
      year: '10',
      abv: '46',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Cítricos, flor y sal ligera.',
      palate: 'Fresco, miel y frutos secos.',
      finish: 'Larga y brillante.',
      overall: 'Muy equilibrado y fresco.',
      score: 85,
      price: '54 €',
      place: 'Bruichladdich',
      transcript: 'Classic Laddie con perfil fresco y cítrico.',
      tags: ['cítrico', 'fresco', 'islay'],
      latitude: 55.7630,
      longitude: -6.3560,
      createdAt: new Date('2026-07-30T20:45:00Z'),
      updatedAt: new Date('2026-07-30T20:45:00Z')
    },
    {
      id: 'demo-scotland-13',
      date: '2026-08-01',
      time: '18:30',
      distillery: 'Bunnahabhain',
      whiskyName: 'Bunnahabhain 12',
      year: '12',
      abv: '46.3',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Miel, manzana y sal suave.',
      palate: 'Muy suave, con lácteos y madera.',
      finish: 'Media y equilibrada.',
      overall: 'Ideal para un perfil menos agresivo.',
      score: 84,
      price: '48 €',
      place: 'Port Charlotte',
      transcript: 'Bunnahabhain 12 suave, afrutado y equilibrado.',
      tags: ['suave', 'equilibrado', 'islay'],
      latitude: 55.7400,
      longitude: -6.2000,
      createdAt: new Date('2026-08-01T18:30:00Z'),
      updatedAt: new Date('2026-08-01T18:30:00Z')
    },
    {
      id: 'demo-scotland-14',
      date: '2026-08-02',
      time: '20:00',
      distillery: 'Royal Lochnagar',
      whiskyName: 'Royal Lochnagar 12',
      year: '12',
      abv: '40',
      type: 'Single Malt',
      region: 'Highlands',
      nose: 'Fruta blanca, flores y madera.',
      palate: 'Delicado con un toque de miel.',
      finish: 'Corta pero muy limpia.',
      overall: 'Muy refinado y fácil.',
      score: 80,
      price: '45 €',
      place: 'Lochnagar',
      transcript: 'Royal Lochnagar 12 delicado y muy refinado.',
      tags: ['delicado', 'refinado', 'highlands'],
      latitude: 56.9540,
      longitude: -3.2450,
      createdAt: new Date('2026-08-02T20:00:00Z'),
      updatedAt: new Date('2026-08-02T20:00:00Z')
    },
    {
      id: 'demo-scotland-15',
      date: '2026-08-03',
      time: '21:45',
      distillery: 'Octomore',
      whiskyName: 'Octomore 8.3',
      year: '8',
      abv: '59.1',
      type: 'Single Malt',
      region: 'Islay',
      nose: 'Turba intensa, sal y madera quemada.',
      palate: 'Muy potente, con café tostado y especias.',
      finish: 'Muy larga y agresiva.',
      overall: 'Extrema y muy potente.',
      score: 94,
      price: '92 €',
      place: 'Port Charlotte',
      transcript: 'Octomore 8.3 muy potente y con turba intensa.',
      tags: ['turba', 'extremo', 'islay'],
      latitude: 55.7420,
      longitude: -6.2050,
      createdAt: new Date('2026-08-03T21:45:00Z'),
      updatedAt: new Date('2026-08-03T21:45:00Z')
    }
  ];
}

function parseReviewFallback(transcript) {
  const text = transcript || '';
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();

  const distillery = text.match(/destiler(?:ía|ia)\s*[:\-]?\s*([A-Za-z0-9 &.]+)/i)?.[1] || '';
  const whisky = text.match(/whisky\s*[:\-]?\s*([A-Za-z0-9 &.]+)/i)?.[1] || text.match(/cata\s*de\s*([A-Za-z0-9 &.]+)/i)?.[1] || '';
  const score = text.match(/(\d{1,3})\s*\/\s*100|nota\s*[:\-]?\s*(\d{1,3})/i)?.[1] || text.match(/nota\s*[:\-]?\s*(\d{1,3})/i)?.[1] || '';
  const age = text.match(/edad\s*[:\-]?\s*(\d{1,2})/i)?.[1] || '';
  const abv = text.match(/abv\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)|graduaci(?:ó|o)n\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)/i)?.[1] || '';
  const region = text.match(/regi(?:ó|o)n\s*[:\-]?\s*([A-Za-z]+)/i)?.[1] || '';
  const place = text.match(/lugar\s*[:\-]?\s*([A-Za-z0-9 ,]+)/i)?.[1] || '';

  const nose = text.match(/nariz\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';
  const palate = text.match(/boca\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';
  const finish = text.match(/final\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';
  const overall = text.match(/sensaci(?:ó|o)n\s*general\s*[:\-]?\s*([^\n.]+)/i)?.[1] || text.match(/general\s*[:\-]?\s*([^\n.]+)/i)?.[1] || '';

  return {
    distillery: normalize(distillery),
    whiskyName: normalize(whisky),
    score: score ? Number(score) : null,
    year: age || '',
    abv: abv || '',
    region: normalize(region),
    place: normalize(place),
    nose: normalize(nose),
    palate: normalize(palate),
    finish: normalize(finish),
    overall: normalize(overall),
    tags: []
  };
}

async function suggestFieldFromTranscript(transcript, fieldName, options = []) {
  if (!openai) return '';

  const allowedOptions = Array.isArray(options) && options.length ? options.join(', ') : '';
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Sugerir únicamente un valor para el campo ${fieldName} a partir de una transcripción de cata de whisky. Devuelve un JSON con una única clave: value. Si hay opciones permitidas, elige una de ellas; si no, devuelve una cadena breve. No añadas texto extra.`
      },
      {
        role: 'user',
        content: `${transcript}${allowedOptions ? `\nOpciones permitidas: ${allowedOptions}` : ''}`
      }
    ],
    temperature: 0.1
  });

  try {
    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return parsed.value || '';
  } catch {
    return '';
  }
}

async function parseReviewFromTranscript(transcript) {
  if (!openai) {
    return parseReviewFallback(transcript);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Extrae los datos de una cata de whisky a partir de una transcripción libre y devuelve únicamente un JSON válido con estas claves: distillery, whiskyName, score, year, abv, region, place, nose, palate, finish, overall, tags, type, price. Usa cadenas vacías o null cuando no haya información. No añadas texto adicional.'
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.1
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const whiskyName = await suggestFieldFromTranscript(transcript, 'whiskyName');
    const suggestionType = await suggestFieldFromTranscript(transcript, 'type', ['Single Malt', 'Blended Malt', 'Blended Scotch', 'Single Grain', 'Grain Whisky', 'Cask Strength', 'Otro']);
    const regionSuggestion = await suggestFieldFromTranscript(transcript, 'region', ['Islay', 'Speyside', 'Highlands', 'Lowlands', 'Campbeltown', 'Islands', 'Otra']);

    return {
      distillery: parsed.distillery || '',
      whiskyName: whiskyName || parsed.whiskyName || parsed.whisky || '',
      score: parsed.score ?? null,
      year: parsed.year || '',
      abv: parsed.abv || '',
      region: regionSuggestion || parsed.region || '',
      place: parsed.place || '',
      nose: parsed.nose || '',
      palate: parsed.palate || '',
      finish: parsed.finish || '',
      overall: parsed.overall || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      type: suggestionType || parsed.type || '',
      price: parsed.price || ''
    };
  } catch {
    return parseReviewFallback(transcript);
  }
}

router.get('/', async (req, res) => {
  const reviews = await Review.find({}).sort({ createdAt: -1 }).lean();
  res.json(reviews);
});

router.post('/', async (req, res) => {
  const review = new Review({
    ...req.body,
    id: req.body.id || createId(),
    createdAt: req.body.createdAt || new Date(),
    updatedAt: new Date()
  });

  await review.save();
  res.status(201).json(review.toObject());
});

router.post('/seed-demo', async (req, res) => {
  try {
    await Review.deleteMany({});
    const docs = getDemoReviews().map((item) => ({
      ...item,
      id: item.id || createId(),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }));
    await Review.insertMany(docs);
    res.json({ imported: docs.length, message: 'Datos de demostración recargados en Escocia' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'No se pudieron recargar los datos' });
  }
});

router.put('/:id', async (req, res) => {
  const updated = await Review.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, id: req.params.id, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!updated) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json(updated.toObject());
});

router.delete('/:id', async (req, res) => {
  const removed = await Review.findOneAndDelete({ id: req.params.id });

  if (!removed) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.status(204).send();
});

router.get('/export/csv', async (req, res) => {
  const reviews = await Review.find({}).lean();
  const headers = ['date','time','distillery','whiskyName','year','abv','type','region','nose','palate','finish','overall','score','price','place','tags','latitude','longitude','createdAt','updatedAt'];
  const rows = reviews.map((review) => headers.map((key) => {
    const value = review[key];
    return Array.isArray(value) ? value.join(' | ') : (value ?? '');
  }));

  const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=whiskana-${formatDate(req.query.date || new Date().toISOString().slice(0, 10))}.csv`);
  res.send(csv);
});

router.get('/export/json', async (req, res) => {
  const reviews = await Review.find({}).lean();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=whiskana-backup.json');
  res.send(JSON.stringify(reviews, null, 2));
});

router.post('/import', async (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : req.body.reviews;

  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Invalid import payload' });
  }

  await Review.deleteMany({});
  const docs = incoming.map((item) => ({
    ...item,
    id: item.id || createId(),
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
  }));
  await Review.insertMany(docs);
  res.json({ imported: docs.length });
});

router.post('/from-audio', upload.single('audio'), async (req, res) => {
  try {
    const transcript = req.body.transcript || '';

    if (!transcript && !req.file) {
      return res.status(400).json({ error: 'Se necesita un audio o un texto de transcripción' });
    }

    let finalTranscript = transcript;

    if (!finalTranscript && req.file) {
      if (!openai) {
        return res.status(400).json({ error: 'No hay API key de OpenAI configurada' });
      }

      const audioFile = new File(
        [req.file.buffer],
        req.file.originalname || 'recording.webm',
        { type: req.file.mimetype || 'audio/webm' }
      );

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1'
      });
      finalTranscript = transcription.text || '';
    }

    const parsed = await parseReviewFromTranscript(finalTranscript);
    const reviewPayload = {
      ...parsed,
      transcript: finalTranscript
    };
    res.json({ transcript: finalTranscript, review: reviewPayload });
  } catch (error) {
    res.status(500).json({ error: error.message || 'No se pudo procesar el audio' });
  }
});

module.exports = router;
