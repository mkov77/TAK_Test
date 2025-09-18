import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [showForm, setShowForm] = useState(false);
  const [entityName, setEntityName] = useState('');
  const [description, setDescription] = useState('');
  const [mgrsInput, setMgrsInput] = useState('');
  const [hae, setHae] = useState('');
  const [remarks, setRemarks] = useState('');
  const [affiliation, setAffiliation] = useState('f'); // default Friendly
  const [unitTypes, setUnitTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [message, setMessage] = useState('');

  // Load CoT unit types from backend
  useEffect(() => {
    axios.get('http://localhost:4000/api/types')
      .then(res => setUnitTypes(res.data))
      .catch(err => console.error(err));
  }, []);

  const affiliations = [
    { label: "Friendly", code: "f" },
    { label: "Hostile/Enemy", code: "h" },
    { label: "Neutral", code: "n" },
    { label: "Unknown", code: "u" }
  ];

  const sendToTak = async () => {
    try {
      const res = await axios.post('http://localhost:4000/api/send', {
        entityName,
        description,
        mgrs: mgrsInput,
        hae: parseFloat(hae) || 0,
        remarks,
        cotCode: selectedType,
        affiliation
      });
      setMessage('Sent! Check WinTAK.');
      console.log(res.data.xml);
    } catch (err) {
      setMessage('Error sending to TAK');
      console.error(err);
    }
  };

  const resetForm = () => {
    setEntityName('');
    setDescription('');
    setMgrsInput('');
    setHae('');
    setRemarks('');
    setAffiliation('f'); // reset to Friendly
    setSelectedType('');
    setMessage('');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>TAK Integration Test</h1>

      <label>
        <input
          type="checkbox"
          checked={showForm}
          onChange={e => setShowForm(e.target.checked)}
        />
        TAK?
      </label>

      {showForm && (
        <div style={{ marginTop: 20 }}>
          <div>
            <input
              type="text"
              placeholder="Entity Name"
              value={entityName}
              onChange={e => setEntityName(e.target.value)}
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label>MGRS Coordinates (e.g., 13S ED 09796 18244): </label>
            <input
              type="text"
              placeholder="Enter MGRS (Zone Band Square Easting Northing)"
              value={mgrsInput}
              onChange={e => setMgrsInput(e.target.value)}
            />
          </div>

          <div>
            <input
              type="number"
              placeholder="Height MSL (ft)"
              value={hae}
              onChange={e => setHae(e.target.value)}
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          <div>
            <label>Affiliation: </label>
            <select value={affiliation} onChange={e => setAffiliation(e.target.value)}>
              {affiliations.map(a => (
                <option key={a.code} value={a.code}>{a.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Unit Type: </label>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
              <option value="">Select a type</option>
              {unitTypes.map(t => (
                <option key={t.code} value={t.code}>
                  {t.label} - {t.desc}
                </option>
              ))}
            </select>
          </div>

          <button onClick={sendToTak} style={{ marginTop: 10 }}>Send to WinTAK</button>
          <button onClick={resetForm} style={{ marginTop: 10, marginLeft: 10 }}>Reset</button>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;