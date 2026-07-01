export function Button({ variant = 'primary', className = '', ...props }) { return <button className={`button button-${variant} ${className}`} {...props} />; }
