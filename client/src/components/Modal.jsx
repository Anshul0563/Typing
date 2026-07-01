import { X } from 'lucide-react';
export function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true"><header><h2>{title}</h2><button aria-label="Close" onClick={onClose}><X /></button></header>{children}</section></div>; }
