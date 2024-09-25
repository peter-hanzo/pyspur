import axios from 'axios';

export const getNodes = async () => {
  try {
    const response = await axios.get('http://localhost:8000/nodes');
    return response.data;
  } catch (error) {
    // Return an empty response if the endpoint fails
    return [];
  }
};