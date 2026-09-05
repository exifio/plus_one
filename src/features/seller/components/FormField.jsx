export default function FormField({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={`form-field${className ? ` ${className}` : ''}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field-required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="item-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
