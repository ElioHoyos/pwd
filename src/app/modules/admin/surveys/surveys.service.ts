import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { delay, map, tap, take, switchMap, filter, catchError } from 'rxjs/operators';
import { Survey, SurveyFormData } from './surveys.types';

const STORAGE_KEY = 'surveys_storage';
const DELAY_MS = 300; // delay para simular llamada API

@Injectable({ providedIn: 'root' })
export class SurveysService {
    // Private
    private _survey: BehaviorSubject<Survey | null> = new BehaviorSubject(null);
    private _surveysList: BehaviorSubject<Survey[] | null> = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for survey
     */
    get survey$(): Observable<Survey> {
        return this._survey.asObservable();
    }

    /**
     * Getter for surveys list
     */
    get surveysList$(): Observable<Survey[]> {
        return this._surveysList.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private getAllFromStorage(): Survey[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    private saveToStorage(surveys: Survey[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw error;
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private formDataToSurvey(formData: SurveyFormData, id?: string): Survey {
        const now = new Date().toISOString();

        const existingSurvey = id ? this.getSurveyByIdSync(id) : null;
        const allSurveys = this.getAllFromStorage();
        const maxOrder = allSurveys.length > 0 
            ? Math.max(...allSurveys.map(n => n.order || 0))
            : -1;
        
        return {
            id: id || this.generateId(),
            title: formData.title,
            description: formData.description,
            institution: formData.institution,
            surveyUrl: formData.surveyUrl,
            surveyDeadline: formData.surveyDeadline,
            surveysMandatory: formData.surveysMandatory,
            statusId: formData.statusId,
            createdAt: existingSurvey?.createdAt || now,
            updatedAt: now,
            order: existingSurvey?.order !== undefined ? existingSurvey.order : maxOrder + 1,
        };
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get surveys list
     */
    getSurveys(): Observable<Survey[]> {
        return this._httpClient.get<Survey[]>('api/apps/surveys/all').pipe(
            tap((surveys) => {
                this._surveysList.next(surveys);
            })
        );
    }

    /**
     * Search surveys with given query
     *
     * @param query
     */
    searchSurveys(query: string): Observable<Survey[]> {
        return this._httpClient
            .get<Survey[]>('api/apps/surveys/search', {
                params: { query },
            })
            .pipe(
                tap((surveys) => {
                    this._surveysList.next(surveys);
                })
            );
    }

    /**
     * Get all surveys (legacy method for compatibility)
     */
    getAll(): Observable<Survey[]> {
        const allSurveys = this.getAllFromStorage();
        // Ordenar por campo order si existe, sino por fecha de creación (más recientes primero)
        const sortedSurveys = allSurveys.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;
            
            if (orderA !== Infinity || orderB !== Infinity) {
                return orderA - orderB;
            }
            
            // Si no hay orden personalizado, ordenar por fecha
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        return of(sortedSurveys).pipe(delay(DELAY_MS));
    }
    
    updateOrder(surveyIds: string[]): Observable<boolean> {
        const allSurveys = this.getAllFromStorage();
        
        // Actualizar el orden de cada encuesta según su posición en el array
        surveyIds.forEach((id, index) => {
            const surveyIndex = allSurveys.findIndex(n => n.id === id);
            if (surveyIndex !== -1) {
                allSurveys[surveyIndex].order = index;
            }
        });
        
        this.saveToStorage(allSurveys);
        return of(true).pipe(delay(DELAY_MS));
    }

    /**
     * Get survey by id
     */
    getSurveyById(id: string): Observable<Survey> {
        return this._surveysList.pipe(
            take(1),
            map((surveysList) => {
                // Find the survey
                const survey = surveysList.find((item) => item.id === id) || null;

                // Update the survey
                this._survey.next(survey);

                // Return the survey
                return survey;
            }),
            switchMap((survey) => {
                if (!survey) {
                    // Try to get from storage as fallback
                    const storedSurvey = this.getAllFromStorage().find((n) => n.id === id);
                    if (storedSurvey) {
                        this._survey.next(storedSurvey);
                        return of(storedSurvey);
                    }
                    return throwError(() => new Error('Could not found survey with id of ' + id + '!'));
                }

                return of(survey);
            })
        );
    }

    /**
     * Get by id (legacy method for compatibility)
     */
    getById(id: string): Observable<Survey | null> {
        return this._httpClient.get<Survey>('api/apps/surveys/survey', {
            params: { id },
        }).pipe(
            map((survey) => survey || null),
            catchError(() => {
                // Fallback to storage if API fails
                const survey = this.getAllFromStorage().find((n) => n.id === id);
                return of(survey || null);
            })
        );
    }

    /**
     * Create survey
     */
    createSurvey(): Observable<Survey> {
        return this.surveysList$.pipe(
            take(1),
            switchMap((surveysList) =>
                this._httpClient
                    .post<Survey>('api/apps/surveys/survey', {})
                    .pipe(
                        map((newSurvey) => {
                            // Update the surveys list with the new survey
                            this._surveysList.next([newSurvey, ...surveysList]);

                            // Return the new survey
                            return newSurvey;
                        })
                    )
            )
        );
    }

    /**
     * Create (legacy method for compatibility)
     */
    create(formData: SurveyFormData): Observable<Survey> {
        const survey = this.formDataToSurvey(formData);
        const allSurveys = this.getAllFromStorage();
        allSurveys.push(survey);
        this.saveToStorage(allSurveys);
        
        // Update BehaviorSubject
        this._surveysList.pipe(take(1)).subscribe((currentList) => {
            this._surveysList.next([survey, ...(currentList || [])]);
        });
        
        return of(survey).pipe(delay(DELAY_MS));
    }

    /**
     * Update survey
     *
     * @param id
     * @param survey
     */
    updateSurvey(id: string, survey: Survey): Observable<Survey> {
        return this.surveysList$.pipe(
            take(1),
            switchMap((surveysList) =>
                this._httpClient
                    .patch<Survey>('api/apps/surveys/survey', {
                        id,
                        ...survey,
                    })
                    .pipe(
                        map((updatedSurvey) => {
                            // Find the index of the updated survey
                            const index = surveysList.findIndex(
                                (item) => item.id === id
                            );

                            // Update the survey
                            if (index > -1) {
                                surveysList[index] = updatedSurvey;
                            }

                            // Update the surveys list
                            this._surveysList.next(surveysList);

                            // Return the updated survey
                            return updatedSurvey;
                        }),
                        switchMap((updatedSurvey) =>
                            this.survey$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the survey if it's selected
                                    this._survey.next(updatedSurvey);

                                    // Return the updated survey
                                    return updatedSurvey;
                                }),
                                map(() => updatedSurvey)
                            )
                        )
                    )
            )
        );
    }

    /**
     * Update (legacy method for compatibility)
     */
    update(id: string, formData: SurveyFormData): Observable<Survey> {
        const allSurveys = this.getAllFromStorage();
        const index = allSurveys.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`Survey with id ${id} not found`));
        }

        const updatedSurvey = this.formDataToSurvey(formData, id);
        allSurveys[index] = updatedSurvey;
        this.saveToStorage(allSurveys);

        // Update BehaviorSubject
        this._surveysList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const listIndex = currentList.findIndex((n) => n.id === id);
                if (listIndex > -1) {
                    currentList[listIndex] = updatedSurvey;
                    this._surveysList.next(currentList);
                }
            }
        });

        return of(updatedSurvey).pipe(delay(DELAY_MS));
    }

    /**
     * Delete the survey
     *
     * @param id
     */
    deleteSurvey(id: string): Observable<boolean> {
        return this.surveysList$.pipe(
            take(1),
            switchMap((surveysList) =>
                this._httpClient
                    .delete('api/apps/surveys/survey', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted survey
                            const index = surveysList.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the survey
                            if (index > -1) {
                                surveysList.splice(index, 1);
                            }

                            // Update the surveys list
                            this._surveysList.next(surveysList);

                            // Return the deleted status
                            return isDeleted;
                        })
                    )
            )
        );
    }

    /**
     * Delete (legacy method for compatibility)
     */
    delete(id: string): Observable<boolean> {
        const allSurveys = this.getAllFromStorage();
        const index = allSurveys.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`Survey with id ${id} not found`));
        }

        allSurveys.splice(index, 1);
        this.saveToStorage(allSurveys);

        // Update BehaviorSubject
        this._surveysList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const filteredList = currentList.filter((n) => n.id !== id);
                this._surveysList.next(filteredList);
            }
        });

        return of(true).pipe(delay(DELAY_MS));
    }

    getSurveyByIdSync(id: string): Survey | null {
        return this.getAllFromStorage().find((n) => n.id === id) || null;
    }

    clearAll(): Observable<boolean> {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return of(true).pipe(delay(DELAY_MS));
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return throwError(() => error);
        }
    }

    getCount(): Observable<number> {
        return of(this.getAllFromStorage().length).pipe(delay(DELAY_MS));
    }
}

