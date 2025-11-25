import { DateTime } from 'luxon';

// Datos del formulario de noticias
export interface NewsFormData {
    title: string;
    description: string;
    hasDetailView: boolean;
    largeDescription?: string;
    registrationLink?: string;
    code: number;
    category: number;
    date: DateTime | string;
    time?: string;
    action: number;
    actionUrl?: string;
    images?: NewsImage[];
}

// Estructura de imagen
export interface NewsImage {
    id: string;
    file?: File;
    previewUrl: string;
    url?: string;
    base64?: string;
}

// Entidad completa de noticia en localStorage
export interface News {
    id: string;
    title: string;
    description: string;
    hasDetailView: boolean;
    largeDescription?: string;
    registrationLink?: string;
    code: number;
    category: number;
    date: string;
    time?: string;
    action: number;
    actionUrl?: string;
    images: NewsImage[];
    createdAt: string;
    updatedAt: string;
    order?: number; // Orden personalizado para la lista
}

// Opción de código (Wiener/Carrion)
export interface NewsCodeOption {
    value: number;
    label: string;
}

// Opción de categoría
export interface NewsCategoryOption {
    value: number;
    label: string;
}

// Opción de acción
export interface NewsActionOption {
    value: number;
    label: string;
}

