// Datos del formulario de encuestas
export interface SurveyFormData {
    title: string;
    description: string;
    institution: number;
    surveyUrl: string;
    surveyDeadline?: string;
    surveysMandatory: boolean;
    statusId: number;
}

// Entidad completa de encuesta
export interface Survey {
    id: string;
    title: string;
    description: string;
    institution: number;
    surveyUrl: string;
    surveyDeadline?: string;
    surveysMandatory: boolean;
    statusId: number;
    createdAt: string;
    updatedAt: string;
    order?: number; // Orden personalizado para la lista
}

// Opción de institución
export interface SurveyInstitutionOption {
    value: number;
    label: string;
}

// Opción de estado
export interface SurveyStatusOption {
    value: number;
    label: string;
}


