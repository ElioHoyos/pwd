// Datos del formulario de notificaciones
export interface NotificationFormData {
    title: string;
    description: string;
    institution: number;
    fileXlsx?: string;
    imagenUrl?: string;
    deepLink?: string;
    notificationHtml?: string;
    imageUrl?: string;
    statusId: number;
}

// Entidad completa de notificación
export interface Notification {
    id: string;
    title: string;
    description: string;
    institution: number;
    fileXlsx?: string;
    imagenUrl?: string;
    deepLink?: string;
    notificationHtml?: string;
    imageUrl?: string;
    statusId: number;
    createdAt: string;
    updatedAt: string;
    order?: number; // Orden personalizado para la lista
}

// Opción de institución
export interface NotificationInstitutionOption {
    value: number;
    label: string;
}

// Opción de estado
export interface NotificationStatusOption {
    value: number;
    label: string;
}

// Estructura de archivo Excel
export interface NotificationExcelFile {
    id: string;
    file?: File;
    previewUrl?: string;
    url?: string;
    name?: string;
}



