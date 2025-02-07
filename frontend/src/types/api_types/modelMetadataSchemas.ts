export interface FieldMetadata {
    enum?: string[]
    default?: any
    title?: string
    minimum?: number
    maximum?: number
    type?: string
    required?: boolean
    properties?: Record<string, FieldMetadata>
}

export interface ModelConstraints {
    max_tokens: number
    min_temperature: number
    max_temperature: number
    supports_JSON_output: boolean
    supports_max_tokens: boolean
    supports_temperature: boolean
}

export interface ModelConstraintsMap {
    [modelId: string]: ModelConstraints
}
