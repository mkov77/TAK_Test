const express = require('express');
const cors = require('cors');
const net = require('net');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const xml2js = require('xml2js');
const mgrs = require('mgrs');

const app = express();
app.use(cors());
app.use(express.json());

const TAK_HOST = '127.0.0.1'; // WinTAK listening host
const TAK_PORT = 8089;        // WinTAK TCP feed port

// helper to escape XML special chars
function xmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// convert JSON entity to CoT XML
function buildCot({ uid, mgrsInput, hae, entityName, description, remarks, affiliation, cotCode }) {
  const now = new Date();
  const time = now.toISOString();
  const stale = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  // ✅ Convert MGRS → [lon, lat]
  let lat = 0, lon = 0;
  try {
    const [convertedLon, convertedLat] = mgrs.toPoint(mgrsInput);
    lon = convertedLon;
    lat = convertedLat;
  } catch (err) {
    throw new Error("Invalid MGRS input");
  }

  // ✅ Convert feet → meters (CoT uses meters)
  const haeMeters = hae ? (parseFloat(hae) * 0.3048).toFixed(2) : 0;

  // Replace wildcard affiliation if present
  let typeCode = cotCode;
  if (typeCode.includes("a-.-")) {
    typeCode = typeCode.replace("a-.-", `a-${affiliation}-`);
  }

  return `
<event version="2.0" uid="${xmlEscape(uid || 'webapp-' + uuidv4())}" type="${typeCode}" how="m-g"
       time="${time}" start="${time}" stale="${stale}">
  <point lat="${lat}" lon="${lon}" hae="${haeMeters}" ce="9999999" le="9999999"/>
  <detail>
    <contact callsign="${xmlEscape(entityName || '')}" />
    <remarks>${xmlEscape(remarks || '')}</remarks>
    <marti>
      <dest>
        <__description>${xmlEscape(description || '')}</__description>
        <__mgrs>${xmlEscape(mgrsInput)}</__mgrs>
      </dest>
    </marti>
  </detail>
</event>
  `.trim();
}

// send XML to WinTAK via TCP
function sendToTak(xml) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(TAK_PORT, TAK_HOST, () => {
      client.write(xml + '\n', 'utf8', () => client.end());
    });
    client.on('close', () => resolve());
    client.on('error', err => reject(err));
  });
}

// POST endpoint for sending CoT
app.post('/api/send', async (req, res) => {
  try {
    const { uid, mgrs: mgrsInput, hae, entityName, description, remarks, affiliation, cotCode } = req.body;
    if (!mgrsInput) return res.status(400).json({ error: 'MGRS required' });

    const xml = buildCot({ uid, mgrsInput, hae, entityName, description, remarks, affiliation, cotCode });
    await sendToTak(xml);
    console.log('Sent to TAK:', xml);
    res.json({ ok: true, xml });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Parse types
// Endpoint to parse CoTtypes.xml into JSON
// Parse types
app.get('/api/types', async (req, res) => {
  try {
    const xml = fs.readFileSync(__dirname + '/CoTtypes.xml', 'utf8');
    const parser = new xml2js.Parser({ explicitArray: true });
    const result = await parser.parseStringPromise(xml);

    if (!result.types || !result.types.cot) {
      return res.status(500).json({ error: 'Invalid CoTtypes.xml structure' });
    }

    const types = result.types.cot.map(t => ({
      code: t.$.cot || t.$.zot,   // some entries use cot, some use zot
      label: t.$.full || '',
      desc: t.$.desc || ''
    }));

    res.json(types);
  } catch (err) {
    console.error("XML Parse Error:", err);
    res.status(500).json({ error: err.message });
  }
});



app.listen(4000, () => console.log('Node server running on http://localhost:4000'));