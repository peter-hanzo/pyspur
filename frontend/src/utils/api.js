import axios from 'axios';
import testInput from '../constants/test_input.js'; // Import the test input directly

const API_BASE_URL = 'http://localhost:8000';

export const runWorkflow = async (workflowData) => {
  try {
    console.log('Workflow Data:', workflowData); // Log the workflowData for debugging
    // if (!workflowData.nodes || !workflowData.links) {
    //   console.error('Workflow data is missing nodes or links');
    //   return;
    // }
    const newData = {
      node: {
        // TODO: Add the node data here of the first node
        config: workflowData.workflow.nodes[0].config,
        id: workflowData.workflow.nodes[0].id,
        node_type: workflowData.workflow.nodes[0].node_type
      },
      input_data: workflowData.input_data,
    }
    console.log('New Data:', newData);
    const response = await axios.post(`${API_BASE_URL}/run_node/`, testInput);
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
