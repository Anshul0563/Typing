import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, Keyboard, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { Brand } from '../components/Brand.jsx';
import { Button } from '../components/Button.jsx';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';

const characters = (value) => Array.from(String(value ?? '').normalize('NFC'));
const testModes = ['Standard', 'TCS', 'NTA'];

function TestPreference({ label, enabled, onChange, disabled }) {
  return <label className={`test-preference ${enabled ? 'is-on' : ''}`}><span>{label}</span><button type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={() => onChange(!enabled)}><i /></button><small>{enabled ? 'ON' : 'OFF'}</small></label>;
}

export default function TypingTest() {
  const { examId } = useParams(); const navigate = useNavigate(); const storageKey = `typepath_test_${examId}`;
  const inputRef = useRef(null); const referenceRef = useRef(null); const currentWordRef = useRef(null); const submittingRef = useRef(false); const activeRef = useRef(false); const typedRef = useRef(''); const endAtRef = useRef(0); const monotonicEndRef = useRef(0); const testTokenRef = useRef(''); const keystrokesRef = useRef(0); const backspacesRef = useRef(0);
  const [data, setData] = useState(null); const [typed, setTyped] = useState(''); const [phase, setPhase] = useState('mode-select'); const [seconds, setSeconds] = useState(0); const [error, setError] = useState(''); const [selectedMode, setSelectedMode] = useState('Standard');
  const [backspaceEnabled, setBackspaceEnabled] = useState(() => localStorage.getItem('typepath_backspace') !== 'false');
  const [wordHighlight, setWordHighlight] = useState(() => localStorage.getItem('typepath_word_highlight') !== 'false');

  useEffect(() => { localStorage.setItem('typepath_backspace', String(backspaceEnabled)); }, [backspaceEnabled]);
  useEffect(() => { localStorage.setItem('typepath_word_highlight', String(wordHighlight)); }, [wordHighlight]);

  const persistSession = useCallback((overrides = {}) => {
    if (!data) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ data, typed: typedRef.current, endAt: endAtRef.current, testToken: testTokenRef.current, totalKeystrokes: keystrokesRef.current, backspaceCount: backspacesRef.current, selectedMode, backspaceEnabled, wordHighlight, ...overrides }));
  }, [backspaceEnabled, data, selectedMode, storageKey, wordHighlight]);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.data?.exam?._id === examId && session.endAt && session.testToken) {
          setData(session.data); setTyped(session.typed || ''); typedRef.current = session.typed || ''; endAtRef.current = session.endAt; testTokenRef.current = session.testToken; keystrokesRef.current = session.totalKeystrokes || 0; backspacesRef.current = session.backspaceCount || 0; if (testModes.includes(session.selectedMode)) setSelectedMode(session.selectedMode); if (typeof session.backspaceEnabled === 'boolean') setBackspaceEnabled(session.backspaceEnabled); if (typeof session.wordHighlight === 'boolean') setWordHighlight(session.wordHighlight);
          const remaining = Math.max(0, session.endAt - Date.now()); monotonicEndRef.current = performance.now() + remaining; setSeconds(Math.ceil(remaining / 1000)); activeRef.current = remaining > 0; setPhase(remaining > 0 ? 'active' : 'expired'); return;
        }
      } catch { sessionStorage.removeItem(storageKey); }
    }
    api(`/exams/${examId}/random-paragraph`).then((value) => { setData(value); setSeconds(value.exam.durationMinutes * 60); }).catch((e) => setError(e.message));
  }, [examId, storageKey]);

  const submit = useCallback(async () => {
    if (submittingRef.current || !data) return;
    submittingRef.current = true; activeRef.current = false; setPhase('submitting');
    try {
      const response = await api('/results', { method: 'POST', body: JSON.stringify({ testToken: testTokenRef.current, paragraphId: data.paragraph._id, typedText: typedRef.current, totalKeystrokes: keystrokesRef.current, backspaceCount: backspacesRef.current, testMode: selectedMode }) });
      sessionStorage.removeItem(storageKey);
      navigate(`/result/${response.result._id}`, { replace: true, state: { result: response.result } });
    } catch (e) {
      setError(e.message); submittingRef.current = false;
      const stillActive = monotonicEndRef.current > performance.now(); activeRef.current = stillActive; setPhase(stillActive ? 'active' : 'ended');
    }
  }, [data, navigate, storageKey, selectedMode]);

  useEffect(() => { if (phase === 'expired' && data) submit(); }, [data, phase, submit]);
  useEffect(() => {
    if (phase !== 'active') return undefined;
    const synchronize = () => {
      const remaining = monotonicEndRef.current - performance.now();
      if (remaining <= 0) { activeRef.current = false; setSeconds(0); submit(); return; }
      setSeconds(Math.ceil(remaining / 1000));
    };
    synchronize();
    const timer = window.setInterval(synchronize, 200);
    document.addEventListener('visibilitychange', synchronize);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', synchronize); };
  }, [phase, submit]);

  useEffect(() => { if (phase === 'active') inputRef.current?.focus({ preventScroll: true }); }, [phase]);
  useEffect(() => { if (phase === 'active') persistSession(); }, [phase, typed, persistSession]);
  useEffect(() => {
    if (!wordHighlight || phase !== 'active' || !currentWordRef.current || !referenceRef.current) return;
    const word = currentWordRef.current; const container = referenceRef.current; const top = word.offsetTop; const bottom = top + word.offsetHeight;
    if (top < container.scrollTop + 18 || bottom > container.scrollTop + container.clientHeight - 18) container.scrollTo({ top: Math.max(0, top - container.clientHeight / 2), behavior: 'smooth' });
  }, [phase, typed, wordHighlight]);

  const begin = async () => {
    setPhase('starting'); setError('');
    try {
      const session = await api(`/exams/${examId}/start`, { method: 'POST', body: JSON.stringify({ paragraphId: data.paragraph._id, testMode: selectedMode }) });
      const remaining = Math.max(0, session.endsAt - Date.now()); testTokenRef.current = session.testToken; endAtRef.current = session.endsAt; monotonicEndRef.current = performance.now() + remaining; activeRef.current = true; setSeconds(Math.ceil(remaining / 1000)); setPhase('active'); persistSession({ selectedMode, endAt: session.endsAt, testToken: session.testToken });
    } catch (e) { setError(e.message); setPhase('instructions'); }
  };
  const restart = async () => {
    activeRef.current = false; setPhase('starting');
    try {
      const session = await api(`/exams/${examId}/start`, { method: 'POST', body: JSON.stringify({ paragraphId: data.paragraph._id, testMode: selectedMode }) });
      const remaining = Math.max(0, session.endsAt - Date.now()); typedRef.current = ''; keystrokesRef.current = 0; backspacesRef.current = 0; testTokenRef.current = session.testToken; endAtRef.current = session.endsAt; monotonicEndRef.current = performance.now() + remaining; activeRef.current = true; setTyped(''); setSeconds(Math.ceil(remaining / 1000)); setPhase('active'); persistSession({ typed: '', selectedMode, endAt: session.endsAt, testToken: session.testToken, totalKeystrokes: 0, backspaceCount: 0 });
    } catch (e) { setError(e.message); setPhase('ended'); }
  };
  const keepCaretAtEnd = () => {
    const input = inputRef.current; if (!input || !activeRef.current) return; const end = input.value.length; if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
  };
  const handleKeyDown = (event) => {
    if (!activeRef.current) { event.preventDefault(); return; }
    if (event.key === 'Tab') {
      event.preventDefault();
      const nextTarget = characters(data.paragraph.content)[characters(typedRef.current).length];
      if (nextTarget === '\t') { const next = `${typedRef.current}\t`; typedRef.current = next; keystrokesRef.current += 1; setTyped(next); }
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Delete', 'Insert'].includes(event.key)) { event.preventDefault(); return; }
    const altGraph = event.getModifierState?.('AltGraph');
    if ((event.ctrlKey || event.metaKey || event.altKey) && !altGraph) { if (['a', 'v', 'x', 'z', 'y', 'Backspace', 'Delete'].includes(event.key.length === 1 ? event.key.toLowerCase() : event.key)) event.preventDefault(); return; }
    if (event.key === 'Backspace') {
      if (!backspaceEnabled) { event.preventDefault(); return; }
      keystrokesRef.current += 1; backspacesRef.current += 1; return;
    }
    if (event.key === 'Enter' || event.key.length === 1 || /^Key|^Digit/.test(event.code)) keystrokesRef.current += 1;
  };
  const handleChange = (event) => {
    if (!activeRef.current) return;
    const maximum = characters(data.paragraph.content).length + 1000;
    const nextCharacters = characters(event.target.value).slice(0, maximum);
    if (!backspaceEnabled && nextCharacters.length < characters(typedRef.current).length) { event.target.value = typedRef.current; return; }
    const next = nextCharacters.join(''); typedRef.current = next; setTyped(next);
  };
  const handleBeforeInput = (event) => {
    const inputType = event.nativeEvent.inputType || '';
    if (['insertFromPaste', 'insertFromDrop', 'insertReplacementText'].includes(inputType) || (!backspaceEnabled && inputType.startsWith('delete'))) event.preventDefault();
  };

  const typedCharacters = useMemo(() => characters(typed), [typed]);
  const referenceTokens = useMemo(() => {
    let offset = 0;
    return (data?.paragraph?.content.match(/\s+|\S+/gu) || []).map((text) => { const length = characters(text).length; const token = { text, start: offset, end: offset + length, isWord: !/^\s+$/u.test(text) }; offset += length; return token; });
  }, [data]);
  const cursor = typedCharacters.length;
  const settingsLocked = !['instructions', 'ended', 'mode-select'].includes(phase);

  if (error && !data) return <main className="test-error"><AlertCircle /><h1>Unable to start test</h1><Notice>{error}</Notice><Button onClick={() => navigate('/dashboard')}>Return to exams</Button></main>;
  if (!data) return <Loader label="Preparing your test…" />;
  
  if (phase === 'mode-select') return <main className="instruction-page"><Brand /><section className="instruction-card instruction-card-wide"><h1>Select Test Mode</h1><p className="lead">Choose how you want to take this test</p><div className="mode-selector"><div className="mode-options"><button className={`mode-button ${selectedMode === 'Standard' ? 'active' : ''}`} onClick={() => setSelectedMode('Standard')}><span className="mode-name">Standard</span><span className="mode-desc">Default typing test format</span></button><button className={`mode-button ${selectedMode === 'TCS' ? 'active' : ''}`} onClick={() => setSelectedMode('TCS')}><span className="mode-name">TCS Mode</span><span className="mode-desc">TCS/GATE format with specific rules</span></button><button className={`mode-button ${selectedMode === 'NTA' ? 'active' : ''}`} onClick={() => setSelectedMode('NTA')}><span className="mode-name">NTA Mode</span><span className="mode-desc">NTA format compatible with SSC exams</span></button></div></div><div className="mode-info"><p><strong>What's the difference?</strong> Each mode follows the specific formatting and scoring rules of that exam board. Choose the one matching your target exam.</p></div><Button className="button-large" onClick={() => setPhase('instructions')}>Continue with {selectedMode}</Button><button className="plain-button" onClick={() => navigate('/dashboard')}>Cancel</button></section></main>;
  
  if (phase === 'instructions' || phase === 'starting') return <main className="instruction-page"><Brand /><section className="instruction-card instruction-card-wide"><div className="instruction-settings"><span>Test settings</span><div><TestPreference label="Backspace" enabled={backspaceEnabled} onChange={setBackspaceEnabled} disabled={settingsLocked} /><TestPreference label="Word highlight" enabled={wordHighlight} onChange={setWordHighlight} disabled={settingsLocked} /></div></div><div className="instruction-exam-logo"><img src={data.exam.logo} alt={`${data.exam.organization} icon`} /></div><span className="exam-pill">{data.exam.language}</span><span className="exam-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }}>{selectedMode}</span><h1>{data.exam.name}</h1><p className="instruction-organization">{data.exam.organization}</p><p className="lead">{data.exam.description}</p><div className="instruction-list"><div><Clock3 /><span><strong>{data.exam.durationMinutes} minute timer</strong><small>The test submits automatically when time ends.</small></span></div><div><Keyboard /><span><strong>Split exam workspace</strong><small>Read the reference above and type in the textarea below.</small></span></div><div><ShieldCheck /><span><strong>Results appear after submission</strong><small>No live speed, accuracy or error count is shown.</small></span></div></div><Notice>{error}</Notice><Button className="button-large" onClick={begin} disabled={phase === 'starting'}>{phase === 'starting' ? 'Starting securely…' : 'Begin test'}</Button><button className="plain-button" onClick={() => setPhase('mode-select')}>Change mode</button><button className="plain-button" onClick={() => navigate('/dashboard')}>Cancel</button></section></main>;

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0'); const secs = String(seconds % 60).padStart(2, '0');
  return <main className="test-page"><header className="test-header"><div className="test-identity"><span>{data.exam.name}</span><small>{data.paragraph.title}</small></div><div className={`timer ${seconds <= 60 ? 'timer-warning' : ''}`}><Clock3 size={19} /><span>{minutes}:{secs}</span></div><div className="test-header-actions"><div className="active-test-settings"><TestPreference label="Backspace" enabled={backspaceEnabled} onChange={setBackspaceEnabled} disabled={settingsLocked} /><TestPreference label="Highlight" enabled={wordHighlight} onChange={setWordHighlight} disabled={settingsLocked} /></div><button className="restart" onClick={restart} disabled={phase !== 'active'}><RotateCcw size={17} />Restart</button></div></header><div className="ssc-test-workspace"><section className="reference-panel"><header><div><span>Reference paragraph</span><small>Read-only</small></div><p>{wordHighlight ? 'Current word highlighting is on' : 'Plain text mode'}</p></header><div ref={referenceRef} className="reference-text" lang={data.exam.language === 'Hindi' ? 'hi' : 'en'} onCopy={(e) => e.preventDefault()}>{referenceTokens.map((token, index) => token.isWord ? <span key={index} ref={wordHighlight && cursor >= token.start && cursor <= token.end ? currentWordRef : null} className={wordHighlight && cursor >= token.start && cursor <= token.end ? 'reference-current-word' : ''}>{token.text}</span> : token.text)}</div></section><section className="entry-panel" onClick={() => inputRef.current?.focus()}><header><div><span>Your typing</span><small>Type the reference text exactly as shown</small></div><span className={`backspace-state ${backspaceEnabled ? 'enabled' : 'disabled'}`}>{backspaceEnabled ? 'Backspace enabled' : 'Backspace disabled'}</span></header><textarea ref={inputRef} className="typing-textarea" value={typed} placeholder="Start typing here…" onKeyDown={handleKeyDown} onChange={handleChange} onSelect={keepCaretAtEnd} onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()} onBeforeInput={handleBeforeInput} spellCheck="false" autoCapitalize="off" autoCorrect="off" autoComplete="off" aria-label="Type the reference paragraph" disabled={phase !== 'active'} /></section></div><footer className="test-footer"><span>{phase === 'ended' ? 'Submission failed. Your text is preserved; retry safely.' : !backspaceEnabled ? 'Backspace is disabled for this test.' : 'Backspace is enabled. Your active test is recovered after refresh.'}</span><Button onClick={submit} disabled={phase === 'submitting'}>{phase === 'submitting' ? 'Submitting…' : phase === 'ended' ? 'Retry submission' : 'Submit test'}</Button></footer></main>;
}
