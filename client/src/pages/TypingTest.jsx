import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock3, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { api } from '../services/api.js';
import { Brand } from '../components/Brand.jsx';
import { Button } from '../components/Button.jsx';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';

const characters = (value) => Array.from(String(value ?? '').normalize('NFC'));
const testModes = ['Custom', 'TCS', 'NTA'];
const selectableTestModes = [
  { value: 'Custom', name: 'Custom Mode', description: 'Use your personal typing preferences' },
  { value: 'TCS', name: 'TCS Mode', description: 'Practise in the SSC-style interface' },
  { value: 'NTA', name: 'NTA Mode', description: 'Practise in the non-SSC exam interface' }
];

function TestPreference({ label, enabled, onChange, disabled }) {
  return <label className={`test-preference ${enabled ? 'is-on' : ''}`}><span>{label}</span><button type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={() => onChange(!enabled)}><i /></button><small>{enabled ? 'ON' : 'OFF'}</small></label>;
}

function TestToolbar({ fontSize, onDecrease, onIncrease, fullscreen, onFullscreen, onReset, disabled }) {
  return <div className="test-toolbar" aria-label="Typing display controls"><div className="font-controls"><button type="button" onClick={onDecrease} disabled={fontSize <= 14 || disabled} aria-label="Decrease text size" title="Decrease text size"><Minus /></button><span aria-live="polite">{fontSize}px</span><button type="button" onClick={onIncrease} disabled={fontSize >= 30 || disabled} aria-label="Increase text size" title="Increase text size"><Plus /></button></div><button type="button" onClick={onFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <Minimize2 /> : <Maximize2 />}<span>{fullscreen ? 'Exit' : 'Fullscreen'}</span></button><button type="button" className="reset-test" onClick={onReset} disabled={disabled} title="Reset test"><RotateCcw /><span>Reset</span></button></div>;
}

export default function TypingTest() {
  const { examId } = useParams(); const navigate = useNavigate(); const storageKey = `typepath_test_${examId}`;
  const inputRef = useRef(null); const referenceRef = useRef(null); const currentWordRef = useRef(null); const submittingRef = useRef(false); const activeRef = useRef(false); const typedRef = useRef(''); const endAtRef = useRef(0); const monotonicEndRef = useRef(0); const testTokenRef = useRef(''); const keystrokesRef = useRef(0); const backspacesRef = useRef(0); const selectedModeRef = useRef('Custom');
  const [data, setData] = useState(null); const [typed, setTyped] = useState(''); const [phase, setPhase] = useState('loading'); const [seconds, setSeconds] = useState(0); const [error, setError] = useState(''); const [selectedMode, setSelectedMode] = useState('Custom');
  const [backspaceEnabled, setBackspaceEnabled] = useState(() => localStorage.getItem('typepath_backspace') !== 'false');
  const [wordHighlight, setWordHighlight] = useState(() => localStorage.getItem('typepath_word_highlight') !== 'false');
  const [timerMinutes, setTimerMinutes] = useState(() => Number(localStorage.getItem('typepath_timer')) || 5);
  const [soundEffects, setSoundEffects] = useState(() => localStorage.getItem('typepath_sound') === 'true');
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('typepath_auto_scroll') !== 'false');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('typepath_font_size')) || 18);
  const [practiceTheme, setPracticeTheme] = useState(() => localStorage.getItem('typepath_practice_theme') || 'light');
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const chooseMode = (mode) => { selectedModeRef.current = mode; setSelectedMode(mode); if (mode !== 'Custom') { setBackspaceEnabled(true); setWordHighlight(true); setAutoScroll(true); setSoundEffects(false); setFontSize(18); setPracticeTheme('light'); } };
  const playTone = useCallback(() => { if (!soundEffects) return; const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 660; gain.gain.value = 0.035; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08); oscillator.addEventListener('ended', () => context.close()); }, [soundEffects]);

  const persistSession = useCallback((overrides = {}) => {
    if (!data) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ data, typed: typedRef.current, endAt: endAtRef.current, testToken: testTokenRef.current, totalKeystrokes: keystrokesRef.current, backspaceCount: backspacesRef.current, selectedMode: selectedModeRef.current, backspaceEnabled, wordHighlight, timerMinutes, soundEffects, autoScroll, fontSize, practiceTheme, ...overrides }));
  }, [autoScroll, backspaceEnabled, data, fontSize, practiceTheme, soundEffects, storageKey, timerMinutes, wordHighlight]);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.data?.exam?._id === examId && session.endAt && session.testToken) {
          const restoredMode = testModes.includes(session.selectedMode) ? session.selectedMode : (session.data.exam.category === 'SSC' ? 'TCS' : 'NTA');
          setData(session.data); setTyped(session.typed || ''); typedRef.current = session.typed || ''; endAtRef.current = session.endAt; testTokenRef.current = session.testToken; keystrokesRef.current = session.totalKeystrokes || 0; backspacesRef.current = session.backspaceCount || 0; selectedModeRef.current = restoredMode; setSelectedMode(restoredMode); if (typeof session.backspaceEnabled === 'boolean') setBackspaceEnabled(session.backspaceEnabled); if (typeof session.wordHighlight === 'boolean') setWordHighlight(session.wordHighlight); if (session.timerMinutes) setTimerMinutes(session.timerMinutes); if (typeof session.soundEffects === 'boolean') setSoundEffects(session.soundEffects); if (typeof session.autoScroll === 'boolean') setAutoScroll(session.autoScroll); if (session.fontSize) setFontSize(session.fontSize); if (session.practiceTheme) setPracticeTheme(session.practiceTheme);
          const remaining = Math.max(0, session.endAt - Date.now()); monotonicEndRef.current = performance.now() + remaining; setSeconds(Math.ceil(remaining / 1000)); activeRef.current = remaining > 0; setPhase(remaining > 0 ? 'active' : 'expired'); return;
        }
      } catch { sessionStorage.removeItem(storageKey); }
    }
    api(`/exams/${examId}/launch`, { method: 'POST', body: '{}' }).then((value) => {
      setData(value);
      if (value.requiresSettings) { const storedTimer = Number(localStorage.getItem('typepath_timer')) || value.exam.durationMinutes; setTimerMinutes(storedTimer); setSeconds(storedTimer * 60); setPhase('practice-settings'); return; }
      selectedModeRef.current = value.testMode; setSelectedMode(value.testMode); setBackspaceEnabled(true); setWordHighlight(true); setAutoScroll(true); setSoundEffects(false); setFontSize(18); setPracticeTheme('light');
      const remaining = Math.max(0, value.endsAt - Date.now()); testTokenRef.current = value.testToken; endAtRef.current = value.endsAt; monotonicEndRef.current = performance.now() + remaining; activeRef.current = true; setSeconds(Math.ceil(remaining / 1000)); setPhase('active');
      sessionStorage.setItem(storageKey, JSON.stringify({ data: value, typed: '', endAt: value.endsAt, testToken: value.testToken, totalKeystrokes: 0, backspaceCount: 0, selectedMode: value.testMode, backspaceEnabled: true, wordHighlight: true }));
    }).catch((e) => { setError(e.message); setPhase('error'); });
  }, [examId, storageKey]);

  const submit = useCallback(async () => {
    if (submittingRef.current || !data) return;
    submittingRef.current = true; activeRef.current = false; setPhase('submitting');
    try {
      const response = await api('/results', { method: 'POST', body: JSON.stringify({ testToken: testTokenRef.current, paragraphId: data.paragraph._id, typedText: typedRef.current, totalKeystrokes: keystrokesRef.current, backspaceCount: backspacesRef.current, testMode: selectedModeRef.current }) });
      sessionStorage.removeItem(storageKey); playTone();
      navigate(`/result/${response.result._id}`, { replace: true, state: { result: response.result } });
    } catch (e) {
      setError(e.message); submittingRef.current = false;
      const stillActive = monotonicEndRef.current > performance.now(); activeRef.current = stillActive; setPhase(stillActive ? 'active' : 'ended');
    }
  }, [data, navigate, playTone, storageKey]);

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
  useEffect(() => {
    if (phase !== 'active') return undefined;
    document.documentElement.style.setProperty('--typing-font-size', `${fontSize}px`);
    if (data?.exam?.category === 'Practice') document.documentElement.dataset.practiceTheme = practiceTheme;
    return () => { delete document.documentElement.dataset.practiceTheme; document.documentElement.style.removeProperty('--typing-font-size'); };
  }, [data, fontSize, phase, practiceTheme]);
  useEffect(() => { const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', syncFullscreen); return () => document.removeEventListener('fullscreenchange', syncFullscreen); }, []);
  useEffect(() => { if (phase === 'active') persistSession(); }, [phase, typed, persistSession]);
  useEffect(() => {
    if (!wordHighlight || !autoScroll || phase !== 'active' || !currentWordRef.current || !referenceRef.current) return;
    const word = currentWordRef.current; const container = referenceRef.current; const top = word.offsetTop; const bottom = top + word.offsetHeight;
    if (top < container.scrollTop + 18 || bottom > container.scrollTop + container.clientHeight - 18) container.scrollTo({ top: Math.max(0, top - container.clientHeight / 2), behavior: 'smooth' });
  }, [autoScroll, phase, typed, wordHighlight]);

  const begin = async () => {
    setPhase('starting'); setError('');
    try {
      if (selectedModeRef.current === 'Custom') { localStorage.setItem('typepath_backspace', String(backspaceEnabled)); localStorage.setItem('typepath_word_highlight', String(wordHighlight)); localStorage.setItem('typepath_timer', String(timerMinutes)); localStorage.setItem('typepath_sound', String(soundEffects)); localStorage.setItem('typepath_auto_scroll', String(autoScroll)); localStorage.setItem('typepath_font_size', String(fontSize)); localStorage.setItem('typepath_practice_theme', practiceTheme); }
      const session = await api(`/exams/${examId}/start`, { method: 'POST', body: JSON.stringify({ paragraphId: data.paragraph._id, requestedMode: selectedModeRef.current, ...(selectedModeRef.current === 'Custom' && { timerMinutes }) }) });
      const remaining = Math.max(0, session.endsAt - Date.now()); testTokenRef.current = session.testToken; endAtRef.current = session.endsAt; monotonicEndRef.current = performance.now() + remaining; selectedModeRef.current = session.testMode; setSelectedMode(session.testMode); activeRef.current = true; setSeconds(Math.ceil(remaining / 1000)); setPhase('active'); persistSession({ selectedMode: session.testMode, endAt: session.endsAt, testToken: session.testToken }); playTone();
    } catch (e) { setError(e.message); setPhase('practice-settings'); }
  };
  const restart = async () => {
    activeRef.current = false; setPhase('starting');
    try {
      const session = await api(`/exams/${examId}/start`, { method: 'POST', body: JSON.stringify({ paragraphId: data.paragraph._id, ...(data.exam.category === 'Practice' && { requestedMode: selectedModeRef.current, ...(selectedModeRef.current === 'Custom' && { timerMinutes }) }) }) });
      const remaining = Math.max(0, session.endsAt - Date.now()); typedRef.current = ''; keystrokesRef.current = 0; backspacesRef.current = 0; testTokenRef.current = session.testToken; endAtRef.current = session.endsAt; monotonicEndRef.current = performance.now() + remaining; selectedModeRef.current = session.testMode; setSelectedMode(session.testMode); activeRef.current = true; setTyped(''); setSeconds(Math.ceil(remaining / 1000)); setPhase('active'); persistSession({ typed: '', selectedMode: session.testMode, endAt: session.endsAt, testToken: session.testToken, totalKeystrokes: 0, backspaceCount: 0 });
    } catch (e) { setError(e.message); setPhase('ended'); }
  };
  const changeFontSize = (amount) => setFontSize((value) => Math.min(30, Math.max(14, value + amount)));
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); inputRef.current?.focus({ preventScroll: true }); } catch { setError('Fullscreen is not available in this browser.'); } };
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

  if (error && !data) return <main className="test-error"><AlertCircle /><h1>Unable to start test</h1><Notice>{error}</Notice><Button onClick={() => navigate('/dashboard')}>Return to exams</Button></main>;
  if (!data) return <Loader label="Preparing your test…" />;
  if (phase === 'error') return <main className="test-error"><AlertCircle /><h1>Unable to start test</h1><Notice>{error}</Notice><Button onClick={restart}>Try again</Button><Button variant="secondary" onClick={() => navigate('/dashboard')}>Return to exams</Button></main>;
  
  if (phase === 'loading') return <Loader label="Starting the correct exam mode…" />;
  if (phase === 'starting' && data.exam.category !== 'Practice') return <Loader label="Resetting your test…" />;

  if (phase === 'practice-settings' || phase === 'starting') return <main className="instruction-page"><Brand /><section className="instruction-card instruction-card-wide practice-settings-card"><div className="instruction-exam-logo"><img src={data.exam.logo} alt={`${data.exam.organization} icon`} /></div><span className="exam-pill">Practice · {data.exam.language}</span><h1>Practice Settings</h1><p className="lead">Customize this practice attempt. These choices never affect actual exams.</p><div className="mode-options">{selectableTestModes.map((mode) => <button key={mode.value} type="button" className={`mode-button ${selectedMode === mode.value ? 'active' : ''}`} onClick={() => chooseMode(mode.value)}><span className="mode-name">{mode.name}</span><span className="mode-desc">{mode.description}</span></button>)}</div>{selectedMode === 'Custom' && <div className="practice-control-grid"><label>Timer<select value={timerMinutes} onChange={(event) => setTimerMinutes(Number(event.target.value))}>{[1, 2, 5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minute{minutes === 1 ? '' : 's'}</option>)}</select></label><label>Font size<input type="range" min="14" max="28" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /><small>{fontSize}px</small></label><label>Theme<select value={practiceTheme} onChange={(event) => setPracticeTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><TestPreference label="Backspace" enabled={backspaceEnabled} onChange={setBackspaceEnabled} disabled={false} /><TestPreference label="Word highlight" enabled={wordHighlight} onChange={setWordHighlight} disabled={false} /><TestPreference label="Sound effects" enabled={soundEffects} onChange={setSoundEffects} disabled={false} /><TestPreference label="Auto scroll" enabled={autoScroll} onChange={setAutoScroll} disabled={false} /></div>}<Notice>{error}</Notice><Button className="button-large" onClick={begin} disabled={phase === 'starting'}>{phase === 'starting' ? 'Starting practice…' : `Start ${selectedMode} Practice`}</Button><button className="plain-button" onClick={() => navigate('/dashboard')}>Cancel</button></section></main>;

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0'); const secs = String(seconds % 60).padStart(2, '0');
  return <main className="test-page"><header className="test-header"><div className="test-identity"><span>{data.exam.name}</span><small>{data.paragraph.title}</small></div><div className={`timer ${seconds <= 60 ? 'timer-warning' : ''}`}><Clock3 size={19} /><span>{minutes}:{secs}</span></div><div className="test-header-actions"><TestToolbar fontSize={fontSize} onDecrease={() => changeFontSize(-1)} onIncrease={() => changeFontSize(1)} fullscreen={isFullscreen} onFullscreen={toggleFullscreen} onReset={restart} disabled={phase !== 'active'} /></div></header><div className="ssc-test-workspace"><section className="reference-panel"><header><div><span>Reference paragraph</span><small>Read-only</small></div><p>{wordHighlight ? 'Current word highlighting is on' : 'Plain text mode'}</p></header><div ref={referenceRef} className="reference-text" lang={data.exam.language === 'Hindi' ? 'hi' : 'en'} onCopy={(e) => e.preventDefault()}>{referenceTokens.map((token, index) => token.isWord ? <span key={index} ref={wordHighlight && cursor >= token.start && cursor <= token.end ? currentWordRef : null} className={wordHighlight && cursor >= token.start && cursor <= token.end ? 'reference-current-word' : ''}>{token.text}</span> : token.text)}</div></section><section className="entry-panel" onClick={() => inputRef.current?.focus()}><header><div><span>Your typing</span><small>Type the reference text exactly as shown</small></div><span className={`backspace-state ${backspaceEnabled ? 'enabled' : 'disabled'}`}>{backspaceEnabled ? 'Backspace enabled' : 'Backspace disabled'}</span></header><textarea ref={inputRef} className="typing-textarea" value={typed} placeholder="Start typing here…" onKeyDown={handleKeyDown} onChange={handleChange} onSelect={keepCaretAtEnd} onPaste={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()} onBeforeInput={handleBeforeInput} spellCheck="false" autoCapitalize="off" autoCorrect="off" autoComplete="off" aria-label="Type the reference paragraph" disabled={phase !== 'active'} /></section></div><footer className="test-footer"><span>{phase === 'ended' ? 'Submission failed. Your text is preserved; retry safely.' : !backspaceEnabled ? 'Backspace is disabled for this test.' : 'Backspace is enabled. Your active test is recovered after refresh.'}</span><Button onClick={submit} disabled={phase === 'submitting'}>{phase === 'submitting' ? 'Submitting…' : phase === 'ended' ? 'Retry submission' : 'Submit test'}</Button></footer></main>;
}
