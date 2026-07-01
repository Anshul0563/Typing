import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const onKeyDown = (event) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => dialogRef.current?.querySelector('input, select, textarea, button')?.focus());
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X /></button></header>{children}</section></div>;
}
