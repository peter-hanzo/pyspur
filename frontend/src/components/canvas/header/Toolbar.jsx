import React from 'react';
import { Button } from '@nextui-org/react'; // Import NextUI Button component

function Toolbar() {
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex' }}>
      <Button auto flat css={{ marginRight: '10px' }}>Run</Button>
      <Button auto flat>Publish</Button>
    </div>
  );
}

export default Toolbar;
