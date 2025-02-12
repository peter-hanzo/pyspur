/**
 * Utility functions for handling JSON Schema operations
 */

/**
 * Generates a JSON Schema from a simple schema object
 * @param schema Record of field names to their types
 * @returns JSON Schema string or null if invalid
 */
export const generateJsonSchemaFromSchema = (schema: Record<string, string>): string | null => {
    if (!schema || Object.keys(schema).length === 0) return null

    try {
        const jsonSchema = {
            type: 'object',
            required: Object.keys(schema),
            properties: {} as Record<string, { type: string }>,
        }

        for (const [key, type] of Object.entries(schema)) {
            if (!key || !type) return null
            jsonSchema.properties[key] = { type }
        }

        return JSON.stringify(jsonSchema, null, 2)
    } catch (error) {
        console.error('Error generating JSON schema:', error)
        return null
    }
}

/**
 * Extracts a schema object from a JSON Schema string
 * @param jsonSchema JSON Schema string to parse
 * @returns Object containing the parsed schema and any error
 */
export const extractSchemaFromJsonSchema = (
    jsonSchema: string
): { schema: Record<string, any> | null; error: string | null } => {
    if (!jsonSchema || !jsonSchema.trim()) {
        return { schema: null, error: null }
    }
    try {
        // Try to parse the schema
        let parsed: Record<string, any>
        try {
            parsed = JSON.parse(jsonSchema.trim())
        } catch (e: any) {
            // If the schema has escaped characters, clean it up first
            let cleaned = jsonSchema
                .replace(/\"/g, '"') // Replace escaped quotes
                .replace(/\\\[/g, '[') // Replace escaped brackets
                .replace(/\\\]/g, ']')
                .replace(/\\n/g, '') // Remove newlines
                .replace(/\\t/g, '') // Remove tabs
                .replace(/\\/g, '') // Remove remaining backslashes
                .trim()
            try {
                parsed = JSON.parse(cleaned)
            } catch (e: any) {
                // Extract line and column info from the error message if available
                const match = e.message.match(/at position (\d+)(?:\s*\(line (\d+) column (\d+)\))?/)
                const errorMsg = match
                    ? `Invalid JSON: ${e.message.split('at position')[0].trim()} at line ${match[2] || '?'}, column ${match[3] || '?'}`
                    : `Invalid JSON: ${e.message}`
                return { schema: null, error: errorMsg }
            }
        }

        // If the parsed schema has a properties field (i.e. full JSON Schema format),
        // return the nested properties so that nested objects are preserved.
        if (parsed.properties) {
            return { schema: parsed.properties, error: null }
        }
        return { schema: parsed, error: null }
    } catch (error: any) {
        return { schema: null, error: error.message || 'Invalid JSON Schema' }
    }
}
