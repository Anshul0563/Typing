import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Gauge, Keyboard, LayoutGrid, RotateCcw, Target, Timer } from 'lucide-react';
import { api } from '../services/api.js';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';

const fallbackParts = (text) => [{ text: String(text || ''), severity: 'correct', category: 'correct' }];
const labels = {
  omission: 'Omissions', addition: 'Additions', spelling: 'Spellings', substitution: 'Substitutions',
  repetition: 'Repetitions', incompleteWord: 'Incomplete Words', spacing: 'Spacing Errors',
  capitalization: 'Capitalization Errors', punctuation: 'Punctuation Errors', transposition: 'Transposition Errors',
  paragraphic: 'Paragraphic Errors'
};
const fullCategories = ['omission', 'addition', 'spelling', 'substitution', 'repetition', 'incompleteWord'];
const halfCategories = ['spacing', 'capitalization', 'punctuation', 'transposition', 'paragraphic'];

function HighlightedText({ parts, emptyLabel }) {
  if (!parts?.length) return <p className="comparison-empty">{emptyLabel}</p>;
  return <p className="comparison-text">{parts.map((part, index) => {
    return part.severity !== 'correct'
      ? <mark key={index} className={`compare-${part.severity}${part.missing ? ' compare-missing' : ''}`} title={`${labels[part.category] || 'Error'}${part.missing ? ' (missing)' : ''}`}>{part.text}</mark>
      : <span key={index}>{part.text}</span>;
  })}</p>;
}

function ErrorColumn({ title, total, categories, breakdown, severity, description }) {
  return <article className={`error-column error-${severity}`}><header><span className={`error-swatch compare-${severity}`} /><div><h3>{title}: {total}</h3><p>{description || (severity === 'half' ? 'Each error carries 0.5 weight' : 'Each error carries full weight')}</p></div></header><div>{categories.map((key) => <span key={key}><small>{labels[key]}</small><strong>{breakdown[key] ?? 0}</strong></span>)}</div></article>;
}

export default function Result() {
  const { id } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) return;
    api(`/results/${id}`).then((data) => setResult(data.result)).catch((reason) => setError(reason.message));
  }, [id, result]);

  const comparison = useMemo(() => {
    if (result?.comparison?.referenceParts && result?.comparison?.typedParts) return result.comparison;
    return { referenceParts: fallbackParts(result?.paragraph?.content), typedParts: fallbackParts(result?.typedText) };
  }, [result]);

  if (error) return <div className="result-load-state"><Notice>{error}</Notice><Link className="button button-secondary" to="/results">Back to results</Link></div>;
  if (!result) return <Loader label="Calculating result…" />;

  const formatTime = (value) => { const seconds = Math.max(0, Math.round(Number(value) || 0)); return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`; };
  const ssc = result.evaluationMode === 'ssc-stenographer';
  const fullErrors = result.fullErrors ?? result.totalErrors ?? 0;
  const halfErrors = result.halfErrors ?? 0;
  const weightedErrors = result.weightedErrors ?? result.errorUnits ?? result.totalErrors ?? 0;
  const breakdown = result.errorBreakdown || {};
  const categoryTotal = (categories) => categories.reduce((total, category) => total + (Number(breakdown[category]) || 0), 0);
  const directFullErrors = categoryTotal(fullCategories);
  const promotedErrors = categoryTotal(halfCategories);
  const metrics = [
    ['Gross WPM', result.grossWpm ?? 0, Gauge, 'blue'], ['Net WPM', result.netWpm ?? 0, Gauge, 'green'],
    ['Accuracy', `${result.accuracy ?? 0}%`, Target, 'violet'], ['Time taken', formatTime(result.timeTaken), Timer, 'amber']
  ];
  const detailGroups = [
    ['Speed & penalty', 'Final speed after the selected error weight.', Gauge, 'blue', [['Gross WPM', result.grossWpm], ['Net WPM', result.netWpm], ['Weighted errors', weightedErrors], ['Penalty', `${result.errorPenalty ?? 1}×`]]],
    ['Characters', 'Unicode character-by-character alignment.', Target, 'green', [['Reference', result.referenceCharacters], ['Typed', result.typedCharacters], ['Correct', result.correctCharacters], ['Raw edits', result.totalErrors]]],
    ['Words', 'Word-level alignment for review.', FileText, 'violet', [['Reference', result.referenceWords], ['Typed', result.typedWords], ['Wrong', result.wrongWords], ['Omitted', result.omittedWords], ['Extra', result.extraWords]]],
    ['Typing activity', 'Activity captured during this attempt.', Keyboard, 'amber', [['Keystrokes', result.totalKeystrokes], ['Backspaces', result.backspaceCount], ['Full errors', fullErrors], ['Half errors', halfErrors]]]
  ];

  return <div className="result-page">
    <section className="result-hero-card"><div className="result-hero-copy"><span className="result-check"><CheckCircle2 /></span><div><p className="eyebrow">Test submitted</p><h1>{result.exam?.name || 'Typing test'} result</h1><p>{ssc ? 'Steno evaluation: every detected mistake counts as one full error.' : 'Standard evaluation: omissions, additions, spellings, repetitions, substitutions and incomplete words count as full errors; spacing, capitalization, punctuation, transposition and paragraphic errors count as half errors.'}</p></div></div></section>

    <section className="metric-grid result-metric-grid" aria-label="Performance summary">{metrics.map(([label, value, Icon, tone]) => <article className={`result-metric-card metric-${tone}`} key={label}><span className="metric-icon"><Icon /></span><div><span>{label}</span><strong>{value}</strong></div></article>)}</section>

    <section className="result-comparison"><div className="result-section-heading"><span>Synchronized review</span><h2>Original Text vs Your Typed Text</h2><p>Both panels use one aligned diff. Red marks full errors; blue marks half errors. ∅, ␠ and ↵ show missing text, spaces and line breaks.</p></div><div className="comparison-card-grid"><article className="comparison-card"><header><FileText /><h3>Original Text</h3><small className="comparison-card-key">Aligned source</small></header><HighlightedText parts={comparison.referenceReviewParts || comparison.referenceParts} emptyLabel="Reference text unavailable." /></article><article className="comparison-card"><header><Keyboard /><h3>Your Typed Text</h3><small className="comparison-card-key">Aligned attempt</small></header><HighlightedText parts={comparison.typedReviewParts || comparison.typedParts} emptyLabel="No text was typed." /></article></div><div className={`comparison-legend ${ssc ? 'single-legend' : ''}`}><div><span><i className="compare-full" />Full Error</span><p>{ssc ? 'All detected mistakes—including spacing, capitalization, punctuation, transposition and paragraphic errors—count as full errors.' : 'Omissions · Additions · Spellings · Repetitions · Substitutions · Incomplete Words'}</p></div>{!ssc && <div><span><i className="compare-half" />Half Error</span><p>Spacing · Capitalization · Punctuation · Transposition · Paragraphic</p></div>}</div></section>

    <section className="result-breakdown panel"><div className="result-section-heading"><span>Scoring details</span><h2>Error breakdown</h2></div><div className="error-column-grid"><ErrorColumn title={ssc ? 'Direct full-error categories' : 'Full Errors'} total={ssc ? directFullErrors : fullErrors} categories={fullCategories} breakdown={breakdown} severity="full" /><ErrorColumn title={ssc ? 'Steno-promoted categories' : 'Half Errors'} total={ssc ? promotedErrors : halfErrors} categories={halfCategories} breakdown={breakdown} severity={ssc ? 'full' : 'half'} description={ssc ? 'These categories also carry full weight in Steno mode' : undefined} /></div></section>

    <section className="result-breakdown panel"><div className="result-section-heading"><span>Attempt data</span><h2>Detailed metrics</h2></div><div className="breakdown-card-grid">{detailGroups.map(([title, detail, Icon, tone, items]) => <article className={`breakdown-group-card breakdown-${tone}`} key={title}><header><span><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div></header><div>{items.map(([label, value]) => <span className="breakdown-chip neutral" key={label}><small>{label}</small><strong>{value ?? 0}</strong></span>)}</div></article>)}</div></section>

    <section className="formula-card"><div><span>Formula used</span><h2>{ssc ? 'Steno formula' : 'Standard exam formula'}</h2></div><p><strong>Accuracy:</strong> ((Reference characters − {ssc ? 'total errors' : 'weighted errors'}) ÷ Reference characters) × 100</p><p><strong>Weighted errors:</strong> {ssc ? 'Every mistake × 1' : 'Full errors + (Half errors × 0.5)'}</p><p><strong>Gross WPM:</strong> (Typed characters ÷ 5) ÷ Time in minutes</p><p><strong>Net WPM:</strong> Gross WPM − (Weighted errors × Penalty ÷ Time in minutes)</p></section>

    <div className="result-actions"><Link className="button button-primary" to={`/test/${result.exam?._id}`}><RotateCcw size={17} />Retake test</Link><Link className="button button-secondary" to="/results"><LayoutGrid size={17} />View history</Link><Link className="button button-secondary" to="/dashboard"><LayoutGrid size={17} />All exams</Link></div>
  </div>;
}
