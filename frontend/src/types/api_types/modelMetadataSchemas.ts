export interface FieldMetadata {
    enum?: string[]
    default?: any
    title?: string
    minimum?: number
    maximum?: number
    type?: string
    required?: boolean
}

export interface ModelConstraints {
    max_tokens: number
    min_temperature: number
    max_temperature: number
    supports_JSON_output: boolean
}

export interface ModelConstraintsMap {
    [modelId: string]: ModelConstraints
}