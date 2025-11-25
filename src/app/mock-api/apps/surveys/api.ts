import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import { cloneDeep, assign } from 'lodash-es';

const STORAGE_KEY = 'surveys_storage';

@Injectable({ providedIn: 'root' })
export class SurveysAppMockApi {
    private _surveys: any[] = [];

    /**
     * Constructor
     */
    constructor(private _fuseMockApiService: FuseMockApiService) {
        // Load from localStorage
        this.loadFromStorage();
        // Register Mock API handlers
        this.registerHandlers();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            this._surveys = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            this._surveys = [];
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._surveys));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private sortSurveys(surveys: any[]): any[] {
        return surveys.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;
            
            if (orderA !== Infinity || orderB !== Infinity) {
                return orderA - orderB;
            }
            
            // Si no hay orden personalizado, ordenar por fecha
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {
        // -----------------------------------------------------------------------------------------------------
        // @ Surveys - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/apps/surveys/all').reply(() => {
            // Load from storage
            this.loadFromStorage();
            // Clone the surveys
            const surveys = cloneDeep(this._surveys);
            // Sort the surveys
            const sortedSurveys = this.sortSurveys(surveys);
            // Return the response
            return [200, sortedSurveys];
        });

        // -----------------------------------------------------------------------------------------------------
        // @ Surveys Search - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/apps/surveys/search')
            .reply(({ request }) => {
                // Get the search query
                const query = request.params.get('query');

                // Load from storage
                this.loadFromStorage();
                // Clone the surveys
                let surveys = cloneDeep(this._surveys);

                // If the query exists...
                if (query) {
                    // Filter the surveys
                    surveys = surveys.filter(
                        (item) =>
                            (item.title &&
                                item.title
                                    .toLowerCase()
                                    .includes(query.toLowerCase())) ||
                            (item.description &&
                                item.description
                                    .toLowerCase()
                                    .includes(query.toLowerCase()))
                    );
                }

                // Sort the surveys
                const sortedSurveys = this.sortSurveys(surveys);

                // Return the response
                return [200, sortedSurveys];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Survey - GET by ID
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/apps/surveys/survey')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Load from storage
                this.loadFromStorage();

                // Find the survey
                const survey = this._surveys.find((item) => item.id === id);

                // Return the response
                return [200, cloneDeep(survey)];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Survey - POST
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPost('api/apps/surveys/survey')
            .reply(() => {
                // Load from storage
                this.loadFromStorage();

                // Generate a new survey
                const maxOrder = this._surveys.length > 0 
                    ? Math.max(...this._surveys.map(n => n.order || 0))
                    : -1;

                const newSurvey = {
                    id: FuseMockApiUtils.guid(),
                    title: 'Nueva Encuesta',
                    description: '',
                    institution: 10,
                    surveyUrl: '',
                    surveyDeadline: null,
                    surveysMandatory: false,
                    statusId: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    order: maxOrder + 1,
                };

                // Add the new survey
                this._surveys.unshift(newSurvey);
                this.saveToStorage();

                // Return the response
                return [200, newSurvey];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Survey - PATCH
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPatch('api/apps/surveys/survey')
            .reply(({ request }) => {
                // Get the id and survey
                const id = request.body.id;
                const survey = cloneDeep(request.body);

                // Load from storage
                this.loadFromStorage();

                // Prepare the updated survey
                let updatedSurvey = null;

                // Find the survey and update it
                this._surveys.forEach((item, index, surveysArray) => {
                    if (item.id === id) {
                        // Update the survey
                        surveysArray[index] = assign({}, surveysArray[index], survey, {
                            id,
                            updatedAt: new Date().toISOString(),
                        });

                        // Store the updated survey
                        updatedSurvey = surveysArray[index];
                    }
                });

                // Save to storage
                if (updatedSurvey) {
                    this.saveToStorage();
                }

                // Return the response
                return [200, updatedSurvey];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Survey - DELETE
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onDelete('api/apps/surveys/survey')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Load from storage
                this.loadFromStorage();

                // Find the survey and delete it
                this._surveys.forEach((item, index) => {
                    if (item.id === id) {
                        this._surveys.splice(index, 1);
                    }
                });

                // Save to storage
                this.saveToStorage();

                // Return the response
                return [200, true];
            });
    }
}


