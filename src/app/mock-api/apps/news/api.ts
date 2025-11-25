import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import { cloneDeep, assign } from 'lodash-es';
import { from, map } from 'rxjs';

const STORAGE_KEY = 'news_storage';

@Injectable({ providedIn: 'root' })
export class NewsMockApi {
    private _news: any[] = [];

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
            this._news = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            this._news = [];
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._news));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private sortNews(news: any[]): any[] {
        return news.sort((a, b) => {
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
        // @ News - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/apps/news/all').reply(() => {
            // Load from storage
            this.loadFromStorage();
            // Clone the news
            const news = cloneDeep(this._news);
            // Sort the news
            const sortedNews = this.sortNews(news);
            // Return the response
            return [200, sortedNews];
        });

        // -----------------------------------------------------------------------------------------------------
        // @ News Search - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/apps/news/search')
            .reply(({ request }) => {
                // Get the search query
                const query = request.params.get('query');

                // Load from storage
                this.loadFromStorage();
                // Clone the news
                let news = cloneDeep(this._news);

                // If the query exists...
                if (query) {
                    // Filter the news
                    news = news.filter(
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

                // Sort the news
                const sortedNews = this.sortNews(news);

                // Return the response
                return [200, sortedNews];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ News - POST
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPost('api/apps/news/news')
            .reply(() => {
                // Load from storage
                this.loadFromStorage();

                // Generate a new news
                const maxOrder = this._news.length > 0 
                    ? Math.max(...this._news.map(n => n.order || 0))
                    : -1;

                const newNews = {
                    id: FuseMockApiUtils.guid(),
                    title: 'Nueva Noticia',
                    description: '',
                    hasDetailView: false,
                    code: 10,
                    category: 1,
                    date: new Date().toISOString(),
                    action: 0,
                    images: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    order: maxOrder + 1,
                };

                // Add the new news
                this._news.unshift(newNews);
                this.saveToStorage();

                // Return the response
                return [200, newNews];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ News - PATCH
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPatch('api/apps/news/news')
            .reply(({ request }) => {
                // Get the id and news
                const id = request.body.id;
                const news = cloneDeep(request.body);

                // Load from storage
                this.loadFromStorage();

                // Prepare the updated news
                let updatedNews = null;

                // Find the news and update it
                this._news.forEach((item, index, newsArray) => {
                    if (item.id === id) {
                        // Update the news
                        newsArray[index] = assign({}, newsArray[index], news, {
                            id,
                            updatedAt: new Date().toISOString(),
                        });

                        // Store the updated news
                        updatedNews = newsArray[index];
                    }
                });

                // Save to storage
                if (updatedNews) {
                    this.saveToStorage();
                }

                // Return the response
                return [200, updatedNews];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ News - DELETE
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onDelete('api/apps/news/news')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Load from storage
                this.loadFromStorage();

                // Find the news and delete it
                this._news.forEach((item, index) => {
                    if (item.id === id) {
                        this._news.splice(index, 1);
                    }
                });

                // Save to storage
                this.saveToStorage();

                // Return the response
                return [200, true];
            });
    }
}


