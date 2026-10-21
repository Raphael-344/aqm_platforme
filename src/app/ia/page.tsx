'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { aqiColor } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface LiveStats {
  alertesCount: number;
  actifsCount: number;
  dernierReleve: string | null;
}

const SUGGESTIONS = [
  'Quelles sont les zones les plus polluées en ce moment ?',
  "Combien d'alertes sont actives ?",
  'Explique-moi comment fonctionne le capteur MAKESENSE',
];

function renderLine(line: string) {
  return line.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#00f5d4', fontWeight: 600 }}>{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div
          className="w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black mr-3 flex-shrink-0 mt-0.5"
          style={{
            background: 'linear-gradient(135deg, #00f5d4, #00ff88)',
            color: '#0a0a0f',
            fontSize: 9,
            lineHeight: 1.2,
            boxShadow: '0 0 14px rgba(0,245,212,0.5)',
          }}
        >
          <span>AQM</span>
          <span>AI</span>
        </div>
      )}
      <div
        className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, rgba(0,245,212,0.14), rgba(0,255,136,0.07))'
            : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isUser ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: 'rgba(255,255,255,0.92)',
        }}
      >
        <div>
          {msg.content.split('\n').map((line, i) => {
            if (line === '') return <div key={i} className="h-2" />;
            if (line.startsWith('- ') || line.startsWith('• ')) {
              return (
                <div key={i} className="flex gap-2 my-0.5">
                  <span style={{ color: '#00f5d4', flexShrink: 0 }}>▸</span>
                  <span>{renderLine(line.slice(2))}</span>
                </div>
              );
            }
            return <div key={i}>{renderLine(line)}</div>;
          })}
        </div>
        {msg.streaming && <span className="cursor-blink" />}
      </div>
    </motion.div>
  );
}

function PredictionChart({ data }: { data: Array<{ timestamp: string; aqi: number; predicted: boolean }> }) {
  if (!data.length) return null;
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    aqi: d.aqi,
    predicted: d.predicted ? d.aqi : null,
    historical: !d.predicted ? d.aqi : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.06)" />
        <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} interval={5} />
        <YAxis domain={[0, 200]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(0,245,212,0.2)', borderRadius: 8 }}
          labelStyle={{ color: '#00f5d4' }}
        />
        <ReferenceLine y={100} stroke="#ffaa00" strokeDasharray="4 2" strokeOpacity={0.5}
          label={{ value: 'OMS 100', fill: '#ffaa00', fontSize: 9 }} />
        <ReferenceLine y={150} stroke="#ff3366" strokeDasharray="4 2" strokeOpacity={0.5}
          label={{ value: 'Alerte 150', fill: '#ff3366', fontSize: 9 }} />
        <Line type="monotone" dataKey="historical" stroke="#00f5d4" strokeWidth={2.5} dot={false}
          name="Historique" connectNulls={false} />
        <Line type="monotone" dataKey="predicted" stroke="#00ff88" strokeWidth={2.5} strokeDasharray="6 3"
          dot={false} name="Prédiction 24h" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function IaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis **AQM Assistant**, l'intelligence artificielle de la plateforme SMART_IO × NOSE.\n\nJ'analyse les données simulées de **127 383 capteurs** répartis dans 21 pays de la zone euro (relevés horaires jusqu'au dernier relevé disponible).\n\nPosez-moi n'importe quelle question sur la qualité de l'air, les alertes, les capteurs ou le projet.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [predCity, setPredCity] = useState('');
  const [predLoading, setPredLoading] = useState(false);
  const [predErreur, setPredErreur] = useState<string | null>(null);
  const [predData, setPredData] = useState<{
    commune: string; pays: string;
    historique: Array<{ timestamp: string; aqi: number; predicted: boolean }>;
    prediction: Array<{ timestamp: string; aqi: number; predicted: boolean }>;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'prediction'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setLiveStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isStreaming = messages[messages.length - 1]?.streaming === true;

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || isStreaming) return;

    setInput('');
    const currentHistory = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: currentHistory }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Erreur.' }]);
        return;
      }

      setLoading(false);
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      }

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
        return updated;
      });

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion à l'API." }]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    if (!predCity.trim()) return;
    setPredLoading(true);
    setPredErreur(null);
    try {
      const res = await fetch('/api/ia/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ville: predCity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPredData(null);
        setPredErreur(data.error ?? 'Prédiction indisponible.');
      } else {
        setPredData(data);
      }
    } catch {
      setPredData(null);
      setPredErreur("Impossible de joindre l'API de prédiction.");
    } finally {
      setPredLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-orbitron text-2xl font-black gradient-text mb-1">✦ INTELLIGENCE ARTIFICIELLE</h1>
          <p className="text-xs opacity-40">SMART_IO × NOSE · 127 383 capteurs · Zone euro · 21 pays</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)', color: '#00f5d4' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          GPT-OSS 120B · Groq
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['chat', 'prediction'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-5 py-2 rounded-xl font-medium text-sm transition-all"
            style={{
              background: activeTab === t ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${activeTab === t ? 'rgba(0,245,212,0.35)' : 'rgba(0,245,212,0.08)'}`,
              color: activeTab === t ? '#00f5d4' : 'rgba(255,255,255,0.4)',
            }}
          >
            {t === 'chat' ? '💬 Chatbot IA' : '📈 Prédiction 24h'}
          </button>
        ))}
      </div>

      {/* ─── CHAT TAB ─── */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">

            {/* Live Stats */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass p-4 rounded-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff88' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Données simulées</span>
              </div>
              {liveStats ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] opacity-40 mb-0.5">Capteurs actifs</div>
                    <div className="font-mono font-bold text-lg" style={{ color: '#00f5d4' }}>
                      {liveStats.actifsCount.toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-40 mb-0.5">Alertes (AQI &gt; 150)</div>
                    <div
                      className="font-mono font-bold text-lg"
                      style={{ color: liveStats.alertesCount > 50 ? '#ff3366' : '#ffaa00' }}
                    >
                      {liveStats.alertesCount.toLocaleString('fr-FR')}
                    </div>
                  </div>
                  {liveStats.dernierReleve && (
                    <div>
                      <div className="text-[10px] opacity-40 mb-0.5">Dernier relevé</div>
                      <div className="text-[10px] font-mono opacity-50">
                        {new Date(liveStats.dernierReleve).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: '#00f5d4', borderTopColor: 'transparent' }}
                  />
                </div>
              )}
            </motion.div>

            {/* Suggestions */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <div className="text-[10px] opacity-30 uppercase tracking-widest mb-2 pl-1">Questions suggérées</div>
              <div className="space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading || isStreaming}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all glass-hover disabled:opacity-40"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(0,245,212,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <span style={{ color: '#00f5d4', marginRight: 6 }}>›</span>
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Powered by */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.08)' }}
            >
              <div className="text-[9px] opacity-30 uppercase tracking-widest mb-1">Propulsé par</div>
              <div className="text-xs font-semibold" style={{ color: '#00f5d4' }}>Groq · GPT-OSS 120B</div>
              <div className="text-[9px] opacity-25 mt-0.5">+ données simulées de la base</div>
            </motion.div>
          </div>

          {/* Chat window */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-3 flex flex-col glass rounded-2xl"
            style={{ height: '68vh' }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence>
                {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
              </AnimatePresence>

              {/* Loading indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black mr-3 flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #00f5d4, #00ff88)',
                      color: '#0a0a0f',
                      fontSize: 9,
                      lineHeight: 1.2,
                      boxShadow: '0 0 14px rgba(0,245,212,0.5)',
                    }}
                  >
                    <span>AQM</span>
                    <span>AI</span>
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: '#00f5d4', animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs opacity-40">AQM Assistant réfléchit...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(0,245,212,0.1)' }}>
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Posez une question sur la qualité de l'air..."
                  disabled={loading || isStreaming}
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(0,245,212,0.2)',
                    color: 'white',
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || isStreaming || !input.trim()}
                  className="px-5 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-30"
                  style={{
                    background: 'rgba(0,245,212,0.15)',
                    border: '1px solid rgba(0,245,212,0.35)',
                    color: '#00f5d4',
                  }}
                >
                  →
                </button>
              </div>
              <div className="mt-2 text-[10px] opacity-20">
                Contexte : données simulées de la base · Historique de conversation complet · Streaming activé
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── PREDICTION TAB ─── */}
      {activeTab === 'prediction' && (
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h2 className="font-semibold mb-4">Prédiction AQI — 48h historique + 24h prévision</h2>
            <div className="flex gap-3 mb-6">
              <input
                value={predCity}
                onChange={e => setPredCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchPrediction()}
                placeholder="Nom de la ville (ex: Paris, Madrid...)"
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,245,212,0.2)', color: 'white' }}
              />
              <button
                onClick={fetchPrediction}
                disabled={predLoading}
                className="px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-40"
                style={{ background: 'rgba(0,245,212,0.15)', border: '1px solid rgba(0,245,212,0.35)', color: '#00f5d4' }}
              >
                {predLoading ? '⏳' : 'Analyser'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['Paris', 'Berlin', 'Madrid', 'Sofia', 'Varsovie', 'Milan', 'Amsterdam'].map(c => (
                <button
                  key={c}
                  onClick={() => setPredCity(c)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all"
                  style={{
                    background: predCity === c ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${predCity === c ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: predCity === c ? '#00f5d4' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {predErreur && (
              <p className="text-sm mb-4" style={{ color: '#ff3366' }}>{predErreur}</p>
            )}

            {predData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-bold text-lg">{predData.commune}</h3>
                  <span className="text-sm opacity-50">{predData.pays}</span>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono mb-4 opacity-50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 border-t-2" style={{ borderColor: '#00f5d4' }} />
                    Historique 48h
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 border-t-2 border-dashed" style={{ borderColor: '#00ff88' }} />
                    Prédiction 24h
                  </div>
                </div>
                <PredictionChart data={[...predData.historique, ...predData.prediction]} />
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="text-xs opacity-40 mb-1">AQI au dernier relevé</div>
                    <div className="font-mono font-bold"
                      style={{ color: aqiColor(predData.historique[predData.historique.length - 1]?.aqi ?? 50) }}>
                      {predData.historique[predData.historique.length - 1]?.aqi ?? '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="text-xs opacity-40 mb-1">Pic prédit 24h</div>
                    <div className="font-mono font-bold" style={{ color: '#ffaa00' }}>
                      {Math.max(...predData.prediction.map(p => p.aqi))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="text-xs opacity-40 mb-1">Moy. prédite</div>
                    <div className="font-mono font-bold" style={{ color: '#00f5d4' }}>
                      {Math.round(predData.prediction.reduce((a, p) => a + p.aqi, 0) / predData.prediction.length)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!predData && !predLoading && (
              <div className="text-center py-12 opacity-30">
                <div className="text-4xl mb-3">📈</div>
                <div className="text-sm">Entrez le nom d&apos;une ville pour voir sa prédiction AQI</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
