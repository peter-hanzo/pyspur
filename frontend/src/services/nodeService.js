import axios from 'axios';

export const getNodes = async () => {
  const response = await axios.get('http://localhost:8000/nodes');
  return response.data;
};