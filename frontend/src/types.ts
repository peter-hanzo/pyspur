export interface Node {
    id: string;
    data: NodeData;
    // Add other node properties as needed
}

export interface NodeData {
    status?: string;
    run?: any; // Define a more specific type if possible
    // Add other node data properties as needed
}

// Add other type definitions as needed

