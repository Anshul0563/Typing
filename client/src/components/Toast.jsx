export function Notice({ type = 'error', children }) { return children ? <div className={`notice notice-${type}`} role="alert">{children}</div> : null; }
