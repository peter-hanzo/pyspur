import axios from 'axios';
import testInput from '../constants/test_input.js'; // Import the test input directly
import { Workflow } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export const runWorkflow = async (workflowData) => {
  try {
    console.log('Workflow Data:', workflowData); // Log the workflowData for debugging

    // save the work flow Data to a file
    // Create a blob from the workflowData
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a link element and trigger a download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflowData.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('New Data:', testInput);

    const response = await axios.post(`${API_BASE_URL}/run_workflow/`, workflowData); // Use the test input instead of the actual data
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

export const getRunStatus = async (runID) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/run/${runID}/status/`);
    return response.data;
  } catch (error) {
    console.error('Error getting run status:', error);
    throw error;
  }
};

export const getWorkflows = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/wf/`);
    return response.data;
  } catch (error) {
    console.error('Error getting workflows:', error);
    throw error;
  }
}

export const createWorkflow = async (workflowData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/wf/`, workflowData);
    return response.data;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

export const updateWorkflow = async (workflowId, workflowData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/wf/${workflowId}/`, workflowData);
    return response.data;
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw error;
  }
}

export const startRun = async (workflowID, runType = 'interactive', initialInputs = {}) => {
  try {
    const requestBody = {
      run_type: runType,
      initial_inputs: {
        "1": { "user_message": "okay, give it to me", "city": "Jabalpur", "units": "celsius" },
        "3": { "user_message": "please enlighten me", "city": "Jabalpur", "units": "celsius" },
        "4": { "user_message": "Why do politicians and actors not like to ride shotgun?" },
        "5": { "user_message": "Complete this joke like Jimmy Carr: Why do politicians and actors not like to ride shotgun?" }
      }
    };
    const response = await axios.post(`${API_BASE_URL}/wf/${workflowID}/start_run/`, requestBody);
    return response.data;
  } catch (error) {
    console.error('Error starting run:', error);
    throw error;
  }
}

export const getWorkflow = async (workflowID) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/wf/${workflowID}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting workflow:', error);
    throw error;
  }
}

export const getAllRuns = async (lastK = 10, parentOnly = true, runType = "batch") => {
  try {
    const params = {
      last_k: lastK,
      parent_only: parentOnly,
      run_type: runType
    };
    const response = await axios.get(`${API_BASE_URL}/run/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching runs:', error);
    throw error;
  }
}

export const downloadOutputFile = async (outputFileID) => {
  try {
    // First, get the output file details to find the original filename
    const fileInfoResponse = await axios.get(`${API_BASE_URL}/of/${outputFileID}/`);
    const fileName = fileInfoResponse.data.file_name;

    // Then, download the file
    const response = await axios.get(`${API_BASE_URL}/of/${outputFileID}/download/`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Use the filename obtained from the output file details
    link.setAttribute('download', fileName);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading output file:', error);
    throw error;
  }
}
