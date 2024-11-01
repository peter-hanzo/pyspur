import React from 'react';
import { Input } from "@nextui-org/react";

const NumberInput = ({ label, value, onChange, disabled }) => (
  <div className="my-4">
    <Input
      type="number"
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled} // Disable when not editing
      fullWidth
    />
  </div>
);

export default NumberInput;
