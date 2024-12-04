import React from 'react';

interface BooleanInputProps {
  label: string;
  value: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const BooleanInput: React.FC<BooleanInputProps> = ({ label, value, onChange, disabled }) => (
  <div className="my-4">
    <label className="text-sm font-semibold mb-2 block">{label}</label>
    <input
      type="checkbox"
      checked={value}
      onChange={onChange}
      className="mr-2"
      disabled={disabled}
    />
    {label}
  </div>
);

export default BooleanInput;