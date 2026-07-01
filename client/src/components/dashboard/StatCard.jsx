export function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  return <article className={`student-stat stat-${tone}`}><span className="student-stat-icon"><Icon size={20} /></span><div><p>{label}</p><strong>{value}</strong></div></article>;
}
