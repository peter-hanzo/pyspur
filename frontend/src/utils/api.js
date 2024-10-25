import axios from 'axios';
import testInput from '../constants/test_input.js'; // Import the test input directly

const API_BASE_URL = 'http://localhost:8000';

export const runWorkflow = async (workflowData) => {
  try {
    console.log('Workflow Data:', workflowData); // Log the workflowData for debugging
    console.log('New Data:', testInput);

    const response = await axios.post(`${API_BASE_URL}/run_workflow/`, workflowData);
    return response.data;
  } catch (error) {
    console.error('Error running workflow:', error);
    throw error;
  }
};

export const getNodeTypes = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/node_types/`);
    return response.data;
  } catch (error) {
    console.error('Error getting node types:', error);
    throw error;
  }
};
