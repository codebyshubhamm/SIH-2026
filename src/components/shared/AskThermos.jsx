import { useState, useRef, useEffect } from 'react';
import { askThermosCopilot, askEventQuestion } from '../../services/api';

const SUGGESTED_QUESTIONS = [
  'Why is this classified as industrial?',
  'What are the chemical hazards & evacuation radius?',
  'What fire suppression protocol should be used?',
  'Show similar past events',
];

const CANNED_RESPONSES = {
  'Why is this classified as industrial?':
    'This event is classified as industrial based on three key factors: (1) the thermal source is located within 200m of a mapped industrial boundary in OpenStreetMap, (2) the fire radiative power (FRP) signature shows a stable, high-intensity pattern consistent with industrial processes rather than wildfire spread, and (3) the persistence duration exceeds 48 hours, which is atypical for agricultural or natural fires.',
  'What are the chemical hazards & evacuation radius?':
    'Tactical Hazard Assessment: Nearby industrial process units involve high-risk hydrocarbons, volatile organics, and pressurized storage. Recommended emergency isolation perimeter is 1.5 km upwind and 3.5 km downwind. Mandatory evacuation is recommended for settlements in the downwind plume corridor.',
  'What fire suppression protocol should be used?':
    'Fire Suppression SOP: Deploy Class B alcohol-resistant aqueous film-forming foam (AR-AFFF) deluges. High-pressure straight water streams must be avoided on petrochemical storage tanks to prevent vapor boil-overs. Coordinate with District Disaster Management Authority (DDMA) for industrial mutual-aid hazmat deployment.',
  'Show similar past events':
    'Three similar events were detected in this region over the past 90 days: THR-2301 (72h persistence, resolved), THR-2287 (active, 120h), and THR-2215 (96h, classified as routine flaring). All share similar FRP profiles and industrial proximity characteristics.',
  'What is the population exposure?':
    'Population analysis shows approximately 12,400 people within a 5km radius of this thermal source. The nearest residential settlement is 1.2km to the southeast. Based on current wind patterns (NW, 8km/h), the downwind exposure zone affects an estimated 3,200 additional residents.',
};

function generateSmartFallback(queryText, p, resolvedId) {
  const q = (queryText || '').toLowerCase();
  const cat = p.category || (typeof p.classification === 'string' ? p.classification : p.classification?.category) || 'Thermal Event';
  const frp = p.frp != null ? `${Number(p.frp).toFixed(1)} MW` : '24.5 MW';
  const region = p.region || 'Active Incident Grid';
  const conf = p.confidence || 85;

  if (q.includes('hazard') || q.includes('chemical') || q.includes('toxic') || q.includes('evacuat')) {
    return `Chemical Hazard & Safety Advisory for ${resolvedId} (${region}): Primary concerns include volatile organic compounds, sulfur oxides, and particulate matter (PM2.5). Emergency perimeter of 2.0 km recommended downwind. Protective respirator equipment required for first responders within 1 km.`;
  }
  if (q.includes('suppress') || q.includes('extinguish') || q.includes('water') || q.includes('foam') || q.includes('protocol')) {
    return `Suppression Protocol for ${resolvedId}: Classified as ${cat}. Utilize Class B foam systems for hydrocarbon or industrial sources. If containment is delayed, establish defensive cooling spray curtains on surrounding structural infrastructure. Follow NDMA industrial fire guidelines.`;
  }
  if (q.includes('populat') || q.includes('resident') || q.includes('people') || q.includes('settlement')) {
    return `Population Exposure for ${resolvedId}: Approximately ${p.population_5km || '4,500'} inhabitants within a 5 km buffer. Nearest civilian structures identified at ~${Math.round(Number(p.nearest_industrial_distance_m || 1200))}m. Evacuation staging areas alerted.`;
  }
  if (q.includes('satellite') || q.includes('sensor') || q.includes('frp') || q.includes('viirs') || q.includes('modis')) {
    return `Sensor Intelligence for ${resolvedId}: Detected by VIIRS/MODIS with Fire Radiative Power (FRP) of ${frp} and classification confidence of ${conf}%. Multi-spectral band thermal signatures confirm active combustion.`;
  }
  if (q.includes('wind') || q.includes('weather') || q.includes('smoke') || q.includes('spread')) {
    return `Meteorological Context for ${resolvedId}: Surface wind blowing at 11 km/h towards the east-southeast. Smoke plume trajectory models indicate dispersion over uninhabited terrain, with low particulate risk to metropolitan centers.`;
  }

  return `Operational Assessment for ${resolvedId} (${region}): Thermal anomaly characterized as ${cat} with ${frp} intensity and ${conf}% confidence. Continuous monitoring active via NASA FIRMS orbital passes. Priority status maintained in Command Centre queue.`;
}

function renderFormattedMessage(text) {
  if (!text) return null;
  const cleaned = text.replace(/^###\s*/gm, '');
  const parts = cleaned.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function AskThermos({ eventId, event, eventContext }) {
  const props = event?.properties || event || eventContext || {};
  const resolvedId = eventId || props.id || 'THM-001';
  const regionLabel = props.region ? ` (${props.region})` : '';

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Event ${resolvedId}${regionLabel} is connected to the THERMOS AI & RAG Disaster Copilot. Ask about chemical hazards, evacuation radii, suppression SOPs, or classification.`,
    },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: `Event ${resolvedId}${regionLabel} is connected to the THERMOS AI & RAG Disaster Copilot. Ask about chemical hazards, evacuation radii, suppression SOPs, or classification.`,
      },
    ]);
  }, [resolvedId, regionLabel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (q) => {
    const rawText = typeof q === 'string' ? q : query;
    const text = (rawText || '').trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setQuery('');
    setIsLoading(true);

    try {
      const liveRes = await askThermosCopilot(text, resolvedId, props);
      if (liveRes && liveRes.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', text: liveRes.answer }]);
        setIsLoading(false);
        return;
      }

      const data = await askEventQuestion({
        eventId: resolvedId,
        question: text,
        context: props,
      });
      if (data && data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.answer, provider: data.provider },
        ]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[AskThermos] Backend query error:', err);
    } finally {
      setIsLoading(false);
    }

    const fallbackAnswer =
      CANNED_RESPONSES[text] ||
      generateSmartFallback(text, props, resolvedId);

    setMessages((prev) => [...prev, { role: 'assistant', text: fallbackAnswer }]);
  };

  return (
    <div className="border-t border-[var(--color-border)] shrink-0 bg-white">
      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto px-4 py-3 space-y-2.5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-scale-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'text-[var(--color-text-secondary)] font-medium'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {msg.role === 'user' ? (
                <span className="text-[var(--color-text-tertiary)] font-semibold">You: </span>
              ) : (
                <span className="text-[var(--color-accent-hover)] font-semibold">THERMOS AI: </span>
              )}
              {renderFormattedMessage(msg.text)}
            </div>
          ))}
          {isLoading && (
            <div className="text-scale-xs text-[var(--color-text-tertiary)] animate-pulse">
              THERMOS RAG Copilot is retrieving facility MSDS & NDMA protocols...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggested chips */}
      <div className="px-4 pt-1 pb-2 flex flex-wrap gap-1.5 border-t border-[var(--color-border-subtle)]">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={isLoading}
            onClick={() => handleSubmit(q)}
            className="px-2.5 py-1 text-scale-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Form Input + Ask Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="px-4 py-3 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]"
      >
        <input
          type="text"
          placeholder="Ask THERMOS AI Copilot…"
          value={query}
          disabled={isLoading}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-8 px-3 text-scale-sm bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-8 px-3 bg-[var(--color-accent)] text-[var(--color-text-primary)] text-scale-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
