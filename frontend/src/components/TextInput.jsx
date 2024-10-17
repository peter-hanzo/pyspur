import React from 'react';

const TextInput = ({ label, value, placeholder, onChange }) => (
  <div className="my-4">
    <label className="font-semibold mb-2 block">{label}</label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full px-3 py-2 border rounded"
    />
  </div>
);

export default TextInput;