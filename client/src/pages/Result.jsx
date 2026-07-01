import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Calculator, CheckCircle2, ChevronDown, FileText, Gauge, Info, Keyboard, LayoutGrid, RotateCcw, Target, Timer } from 'lucide-react';
import { api } from '../services/api.js';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';

const characters = (value) => Array.from(String(value ?? '').normalize('NFC'));

function buildComparison(referenceText, typedText) {
  const reference = characters(referenceText);
  const typed = characters(typedText);
  const width = typed.length + 1;
  const cost = new Uint16Array((reference.length + 1) * width);
  const direction = new Uint8Array((reference.length + 1) * width);

  for (let i = 1; i <= reference.length; i += 1) { cost[i * width] = i; direction[i * width] = 2; }
  for (let j = 1; j <= typed.length; j += 1) { cost[j] = j; direction[j] = 3; }

  for (let i = 1; i <= reference.length; i += 1) {
    for (let j = 1; j <= typed.length; j += 1) {
      const index = i * width + j;
      const diagonal = (i - 1) * width + j - 1;
      if (reference[i - 1] === typed[j - 1]) {
        cost[index] = cost[diagonal];
        direction[index] = 1;
        continue;
      }
      const substitute = cost[diagonal] + 1;
      const omit = cost[(i - 1) * width + j] + 1;
      const extra = cost[i * width + j - 1] + 1;
      if (substitute <= omit && substitute <= extra) { cost[index] = substitute; direction[index] = 4; }
      else if (omit <= extra) { cost[index] = omit; direction[index] = 2; }
      else { cost[index] = extra; direction[index] = 3; }
    }
  }

  const referenceParts = [];
  const typedParts = [];
  let i = reference.length;
  let j = typed.length;
  while (i > 0 || j > 0) {
    const move = direction[i * width + j];
    if (move === 1) {
      referenceParts.push({ text: reference[i - 1], type: 'correct' });
      typedParts.push({ text: typed[j - 1], type: 'correct' });
      i -= 1; j -= 1;
    } else if (move === 4) {
      referenceParts.push({ text: reference[i - 1], type: 'full' });
      typedParts.push({ text: typed[j - 1], type: 'full' });
      i -= 1; j -= 1;
    } else if (move === 2 || j === 0) {
      referenceParts.push({ text: reference[i - 1], type: 'omission' });
      i -= 1;
    } else {
      typedParts.push({ text: typed[j - 1], type: 'addition' });
      j -= 1;
    }
  }

  return { referenceParts: referenceParts.reverse(), typedParts: typedParts.reverse() };
}

function HighlightedText({ parts }) {
  return <p className="comparison-text">{parts.map((part, index) => (part.severity || part.type) === 'correct' ? part.text : <mark key={index} className={`compare-${part.severity || 'full'}`} title={part.category}>{part.text}</mark>)}</p>;
}

function ResultPanel({ title, icon: Icon, children }) {
  return <details className="result-panel" open><summary><span><Icon />{title}</span><ChevronDown /></summary><div>{children}</div></details>;
}

export default function Result() {
  const { id } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [error, setError] = useState('');

  useEffect(() => { if (!result) api(`/results/${id}`).then((d) => setResult(d.result)).catch((e) => setError(e.message)); }, [id, result]);

  const comparison = useMemo(() => result?.comparison?.referenceParts ? result.comparison : buildComparison(result?.paragraph?.content || '', result?.typedText || ''), [result]);

  if (error) return <Notice>{error}</Notice>;
  if (!result) return <Loader label="Calculating result…" />;

  const formatTime = (value) => {
    const total = Math.round(value || 0);
    return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
  };
  const metrics = [
    { label: 'Gross WPM', value: result.grossWpm, icon: Gauge, tone: 'blue' },
    { label: 'Net WPM', value: result.netWpm, icon: Gauge, tone: 'green' },
    { label: 'Accuracy', value: `${result.accuracy}%`, icon: Target, tone: 'violet' },
    { label: 'Time taken', value: formatTime(result.timeTaken), icon: Timer, tone: 'amber' }
  ];
  const breakdownGroups = [
    { title: 'Speed & Scoring', detail: 'Final WPM and penalty calculation.', icon: Gauge, tone: 'blue', items: [['Gross WPM', result.grossWpm, 'good'], ['Net WPM', result.netWpm, 'good'], ['Error units', result.errorUnits ?? '-', 'bad'], ['Penalty', `${result.errorPenalty ?? 1}x`, 'neutral']] },
    { title: 'Character Accuracy', detail: result.evaluationMode === 'ssc-stenographer' ? 'SSC: every mistake has full weight.' : 'Practice: half errors have 0.5 weight.', icon: Target, tone: 'green', items: [['Correct chars', result.correctCharacters, 'good'], ['Full errors', result.fullErrors ?? result.totalErrors, 'bad'], ['Half errors', result.halfErrors ?? 0, 'neutral'], ['Weighted errors', result.weightedErrors ?? result.totalErrors, 'bad'], ['Reference chars', result.referenceCharacters ?? '-', 'neutral']] },
    { title: 'Word Accuracy', detail: 'Word-level alignment summary.', icon: FileText, tone: 'violet', items: [['Typed words', result.typedWords ?? '-', 'neutral'], ['Reference words', result.referenceWords ?? '-', 'neutral'], ['Wrong words', result.wrongWords ?? '-', 'bad'], ['Omitted words', result.omittedWords ?? '-', 'bad'], ['Extra words', result.extraWords ?? '-', 'neutral']] },
    { title: 'Typing Activity', detail: 'Raw activity captured during test.', icon: Keyboard, tone: 'amber', items: [['Typed chars', result.typedCharacters ?? '-', 'neutral'], ['Total keystrokes', result.totalKeystrokes ?? '-', 'neutral'], ['Backspaces', result.backspaceCount ?? '-', 'neutral'], ['Time taken', formatTime(result.timeTaken), 'neutral']] }
  ];
  const ruleLabel = result.scoringMode === 'character' ? 'character errors divided by 5' : 'uncorrected word errors';
  const referenceWordUnits = Math.max(1, (result.referenceCharacters || 0) / 5);
  const errorPercentage = Math.min(100, ((result.totalErrors || 0) / referenceWordUnits) * 100).toFixed(2);

  return <div className="result-page"><section className="result-hero-card"><div className="result-hero-copy"><span className="result-check"><CheckCircle2 /></span><div><p className="eyebrow">Test submitted</p><h1>{result.exam?.name || 'Typing test'} result</h1><p>Net WPM used {ruleLabel} with a {result.errorPenalty ?? 1}x penalty.</p></div></div><div className="result-hero-score"><span>{result.testMode || 'TCS'} Mode</span><strong>{result.netWpm}</strong><small>Net WPM</small></div></section><div className="metric-grid result-metric-grid">{metrics.map(({ label, value, icon: Icon, tone }) => <article className={`result-metric-card metric-${tone}`} key={label}><span className="metric-icon"><Icon /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</div><section className="panel result-breakdown"><div className="result-breakdown-head"><div><span>Detailed metrics</span><h2>Detailed breakdown</h2></div><strong>{result.testMode || 'TCS'} Mode</strong></div><div className="breakdown-card-grid">{breakdownGroups.map((group) => { const Icon = group.icon; return <article className={`breakdown-group-card breakdown-${group.tone}`} key={group.title}><header><span><Icon /></span><div><h3>{group.title}</h3><p>{group.detail}</p></div></header><div>{group.items.map(([label, value, tone]) => <span className={`breakdown-chip ${tone}`} key={`${group.title}-${label}`}><small>{label}</small><strong>{value}</strong></span>)}</div></article>; })}</div></section><ResultPanel title="Error Breakdown" icon={Info}><div className="error-groups"><div><h3>Full Errors: {result.totalErrors ?? 0}</h3><p>Omissions: {result.omittedCharacters ?? 0}</p><p>Additions: {result.extraCharacters ?? 0}</p><p>Substitutions/Repetitions Errors: {result.wrongCharacters ?? 0}</p><p>Incomplete Words: {result.omittedWords ?? 0}</p></div><div><h3>Half Errors: 0</h3><p>Spacing Errors: 0</p><p>Capitalization Errors: 0</p><p>Punctuation Errors: 0</p><p>Transposition Errors: 0</p><p>Paragraphic Errors: 0</p></div></div></ResultPanel><ResultPanel title="Calculation Formulas" icon={Calculator}><div className="formula-list"><p><strong>Total Keystrokes:</strong> Count of characters in final typed text</p><p><strong>Backspace Pressed:</strong> Number of backspace key presses</p><p><strong>Total Words Typed:</strong> Total keystrokes / 5</p><p><strong>Total Errors:</strong> Full errors + half errors / 2</p><p><strong>Error Percentage:</strong> Min(100, total errors / (reference keystrokes / 5) x 100) = {errorPercentage}%</p><p><strong>Gross WPM:</strong> Keystrokes typed / 5 / time in minutes</p><p><strong>Net WPM:</strong> Gross WPM - error units / time in minutes</p><p><strong>Accuracy:</strong> Correct characters / (correct characters + total errors) x 100</p><p><strong>Qualification:</strong> Error percentage should stay within the exam limit configured by your institute.</p></div></ResultPanel>{result.paragraph?.content && <section className="result-panel comparison-panel"><header><FileText /><h2>Original Text</h2></header><HighlightedText parts={comparison.referenceParts} /></section>}<section className="result-panel comparison-panel"><header><Keyboard /><h2>Your Typed Text</h2></header><HighlightedText parts={comparison.typedParts.length ? comparison.typedParts : [{ text: 'No text typed.', type: 'full' }]} /><div className="comparison-legend"><span><i className="compare-omission" />Omission</span><span><i className="compare-addition" />Addition</span><span><i className="compare-full" />Full Error</span></div></section><div className="result-actions"><Link className="button button-primary" to={`/test/${result.exam?._id}`}><RotateCcw size={17} />Retake test</Link><Link className="button button-secondary" to="/results"><LayoutGrid size={17} />View test history</Link><Link className="button button-secondary" to="/dashboard"><LayoutGrid size={17} />All exams</Link></div></div>;
}
