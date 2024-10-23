import React from 'react';

const NumberInput = ({ label, value, onChange }) => (
  <div className="my-4">
    <label className="font-semibold mb-2 block">{label}</label>
    <input
      type="number"
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border rounded"
    />
  </div>
);

export default NumberInput;