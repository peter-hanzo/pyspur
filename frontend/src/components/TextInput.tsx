import React from 'react';

interface TextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, placeholder, onChange, disabled }) => (
  <div className="my-4">
    <label className="text-sm font-semibold mb-2 block">{label}</label>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full px-3 py-1 border rounded focus:outline-none focus:ring focus:border-blue-300 disabled:opacity-50 disabled:bg-gray-100"
      disabled={disabled}
    />
  </div>
);

export default TextInput;