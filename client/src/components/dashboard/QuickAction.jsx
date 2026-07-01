import { Link } from 'react-router-dom';
export function QuickAction({ to, icon: Icon, label, detail, tone = 'blue' }) { return <Link className={`quick-action quick-${tone}`} to={to}><span><Icon size={19} /></span><div><strong>{label}</strong><small>{detail}</small></div></Link>; }
