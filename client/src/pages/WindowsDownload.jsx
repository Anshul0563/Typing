import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, Github, HardDrive, RefreshCw, ShieldCheck } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { Footer } from '../components/Footer.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

const REPOSITORY = 'Anshul0563/Typing-Desktop';
const RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const RELEASES_URL = `https://github.com/${REPOSITORY}/releases`;
const formatSize = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : 'Size unavailable';

export default function WindowsDownload() {
  const { settings } = useSiteSettings();
  const [release, setRelease] = useState(null);
  const [status, setStatus] = useState('loading');

  const loadRelease = async (signal) => {
    setStatus('loading');
    try {
      const response = await fetch(RELEASE_API, {
        signal,
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) throw new Error('release-unavailable');
      const latest = await response.json();
      const executables = latest.assets?.filter((asset) => asset.name.toLowerCase().endsWith('.exe')) || [];
      const exe = executables.find((asset) => /setup/i.test(asset.name)) || executables[0];
      const portable = executables.find((asset) => /portable/i.test(asset.name));
      setRelease({ ...latest, exe, portable });
      setStatus(exe ? 'ready' : 'missing-exe');
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('unavailable');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadRelease(controller.signal);
    return () => controller.abort();
  }, []);

  const published = release?.published_at
    ? new Date(release.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return <div className="download-page">
    <header className="public-nav"><Link to="/" aria-label={`${settings.siteName} home`}><Brand /></Link><div><Link className="text-link" to="/login">Log in</Link><Link className="button button-primary" to="/register">Create account</Link></div></header>
    <main className="download-main">
      <section className="download-hero">
        <span><Download />Windows desktop app</span>
        <h1>Practise with {settings.siteName} on Windows.</h1>
        <p>Download the newest installer directly from our official GitHub release. The version shown here updates automatically whenever a new release is published.</p>
      </section>

      <section className="download-card">
        <div className="download-app-icon"><span></span><span></span><span></span><span></span></div>
        <div className="download-release-info">
          <small>Latest Windows release</small>
          <h2>{status === 'ready' ? release.name || release.tag_name : status === 'loading' ? 'Checking GitHub…' : 'Installer coming soon'}</h2>
          {status === 'ready' && <div className="download-meta"><span>{release.tag_name}</span><span><HardDrive />{formatSize(release.exe.size)}</span>{published && <span>Published {published}</span>}</div>}
          {status === 'ready' && <div className="download-actions"><a className="button button-primary download-button" href={release.exe.browser_download_url}><Download />Download installer</a>{release.portable && release.portable.id !== release.exe.id && <a className="button button-secondary download-button" href={release.portable.browser_download_url}><HardDrive />Portable version</a>}</div>}
          {status === 'loading' && <div className="download-loading"><RefreshCw />Finding the latest version…</div>}
          {status === 'missing-exe' && <><p>The latest release does not contain a Windows `.exe` file yet.</p><a className="button button-secondary" href={release.html_url || RELEASES_URL} target="_blank" rel="noopener noreferrer"><Github />View GitHub release</a></>}
          {status === 'unavailable' && <><p>No public release is available right now. Publish a GitHub Release with an `.exe` asset and it will appear here automatically.</p><button className="button button-secondary" onClick={() => loadRelease()}><RefreshCw />Check again</button></>}
        </div>
      </section>

      <section className="download-features">
        <article><CheckCircle2 /><div><strong>Always the latest version</strong><p>The download is selected live from the newest published GitHub Release.</p></div></article>
        <article><ShieldCheck /><div><strong>Official source</strong><p>The installer comes directly from the project’s GitHub repository.</p></div></article>
        <article><Github /><div><strong>Release details</strong><p>Version, publish date and file size are verified before download.</p></div></article>
      </section>
    </main>
    <Footer />
  </div>;
}
