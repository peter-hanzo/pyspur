import React from 'react';

const BooleanInput = ({ label, value, onChange, disabled }) => (
  <div className="my-4">
    <label className="text-sm font-semibold mb-2 block">{label}</label>
    <input
      type="checkbox"
      checked={value}
      onChange={onChange}
      className="mr-2"
      disabled={disabled} // Disable when not editing
    />
    {label}
  </div>
);

export default BooleanInput;
