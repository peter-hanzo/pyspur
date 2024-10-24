import axios from 'axios';
import testInput from '../constants/test_input.js'; // Import the test input directly

const API_BASE_URL = 'http://localhost:8000';

export const runWorkflow = async (workflowData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/run_workflow/`, testInput);
    return response.data;
  } catch (error) {
    console.error('Error running workflow:', error);
    throw error;
  }
};
