import { v4 as uuidv4 } from 'uuid';

export const createDefaultInputNode = () => ({
  id: 'input-' + uuidv4(),
  type: 'input',
  position: { x: 100, y: 100 },
  data: {
    title: 'Input Variables',
    userconfig: {
      title: 'Input Variables',
      input_schema: {
        paper_name: {
          type: 'string',
          description: 'Name of the paper'
        }
      }
    }
  }
});