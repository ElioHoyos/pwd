import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { delay, map, tap, take, switchMap, filter } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { News, NewsFormData } from './news.types';

const STORAGE_KEY = 'news_storage';
const DELAY_MS = 300; // delay para simular llamada API

@Injectable({ providedIn: 'root' })
export class NewsService {
    // Private
    private _news: BehaviorSubject<News | null> = new BehaviorSubject(null);
    private _newsList: BehaviorSubject<News[] | null> = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for news
     */
    get news$(): Observable<News> {
        return this._news.asObservable();
    }

    /**
     * Getter for news list
     */
    get newsList$(): Observable<News[]> {
        return this._newsList.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private getAllFromStorage(): News[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    private saveToStorage(news: News[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(news));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw error;
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private formDataToNews(formData: NewsFormData, id?: string): News {
        const now = new Date().toISOString();

        // Limpiar imágenes: quitar File objects
        const images = (formData.images || []).map((img) => ({
            id: img.id,
            previewUrl: img.previewUrl,
            url: img.url,
            base64: img.base64,
        }));

        // Convertir DateTime a string ISO
        let dateString: string;
        if (typeof formData.date === 'string') {
            dateString = formData.date;
        } else if (formData.date && typeof formData.date === 'object' && 'toISO' in formData.date) {
            dateString = formData.date.toISO() || new Date().toISOString();
        } else {
            dateString = new Date().toISOString();
        }

        const existingNews = id ? this.getNewsByIdSync(id) : null;
        const allNews = this.getAllFromStorage();
        const maxOrder = allNews.length > 0
            ? Math.max(...allNews.map(n => n.order || 0))
            : -1;

        return {
            id: id || this.generateId(),
            title: formData.title,
            description: formData.description,
            hasDetailView: formData.hasDetailView,
            largeDescription: formData.largeDescription,
            registrationLink: formData.registrationLink,
            code: formData.code,
            category: formData.category,
            date: dateString,
            time: formData.time,
            action: formData.action,
            actionUrl: formData.actionUrl,
            images: images,
            createdAt: existingNews?.createdAt || now,
            updatedAt: now,
            order: existingNews?.order !== undefined ? existingNews.order : maxOrder + 1,
        };
    }

    /**
     * Get news list
     */
    getNews(): Observable<News[]> {
        return this._httpClient.get<News[]>('api/apps/news/all').pipe(
            tap((news) => {
                this._newsList.next(news);
            })
        );
    }

    /**
     * Search news with given query
     *
     * @param query
     */
    searchNews(query: string): Observable<News[]> {
        return this._httpClient
            .get<News[]>('api/apps/news/search', {
                params: { query },
            })
            .pipe(
                tap((news) => {
                    this._newsList.next(news);
                })
            );
    }

    /**
     * Get all news (legacy method for compatibility)
     */
    getAll(): Observable<News[]> {
        const allNews = this.getAllFromStorage();
        // Ordenar por campo order si existe, sino por fecha de creación (más recientes primero)
        const sortedNews = allNews.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;

            if (orderA !== Infinity || orderB !== Infinity) {
                return orderA - orderB;
            }

            // Si no hay orden personalizado, ordenar por fecha
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return of(sortedNews).pipe(delay(DELAY_MS));
    }

    updateOrder(newsIds: string[]): Observable<boolean> {
        const allNews = this.getAllFromStorage();

        // Actualizar el orden de cada noticia según su posición en el array
        newsIds.forEach((id, index) => {
            const newsIndex = allNews.findIndex(n => n.id === id);
            if (newsIndex !== -1) {
                allNews[newsIndex].order = index;
            }
        });

        this.saveToStorage(allNews);
        return of(true).pipe(delay(DELAY_MS));
    }

    /**
     * Get news by id
     */
    getNewsById(id: string): Observable<News> {
        return this._newsList.pipe(
            take(1),
            map((newsList) => {
                // Find the news
                const news = newsList.find((item) => item.id === id) || null;

                // Update the news
                this._news.next(news);

                // Return the news
                return news;
            }),
            switchMap((news) => {
                if (!news) {
                    // Try to get from storage as fallback
                    const storedNews = this.getAllFromStorage().find((n) => n.id === id);
                    if (storedNews) {
                        this._news.next(storedNews);
                        return of(storedNews);
                    }
                    return throwError(() => new Error('Could not found news with id of ' + id + '!'));
                }

                return of(news);
            })
        );
    }

    /**
     * Get by id (legacy method for compatibility)
     */
    getById(id: string): Observable<News | null> {
        const news = this.getAllFromStorage().find((n) => n.id === id);
        return of(news || null).pipe(delay(DELAY_MS));
    }

    /**
     * Create news
     */
    createNews(): Observable<News> {
        return this.newsList$.pipe(
            take(1),
            switchMap((newsList) =>
                this._httpClient
                    .post<News>('api/apps/news/news', {})
                    .pipe(
                        map((newNews) => {
                            // Update the news list with the new news
                            this._newsList.next([newNews, ...newsList]);

                            // Return the new news
                            return newNews;
                        })
                    )
            )
        );
    }

    /**
     * Create (legacy method for compatibility)
     */
    create(formData: NewsFormData): Observable<News> {
        const news = this.formDataToNews(formData);
        const allNews = this.getAllFromStorage();
        allNews.push(news);
        this.saveToStorage(allNews);

        // Update BehaviorSubject
        this._newsList.pipe(take(1)).subscribe((currentList) => {
            this._newsList.next([news, ...(currentList || [])]);
        });

        return of(news).pipe(delay(DELAY_MS));
    }

    /**
     * Update news
     *
     * @param id
     * @param news
     */
    updateNews(id: string, news: News): Observable<News> {
        return this.newsList$.pipe(
            take(1),
            switchMap((newsList) =>
                this._httpClient
                    .patch<News>('api/apps/news/news', {
                        id,
                        ...news,
                    })
                    .pipe(
                        map((updatedNews) => {
                            // Find the index of the updated news
                            const index = newsList.findIndex(
                                (item) => item.id === id
                            );

                            // Update the news
                            if (index > -1) {
                                newsList[index] = updatedNews;
                            }

                            // Update the news list
                            this._newsList.next(newsList);

                            // Return the updated news
                            return updatedNews;
                        }),
                        switchMap((updatedNews) =>
                            this.news$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the news if it's selected
                                    this._news.next(updatedNews);

                                    // Return the updated news
                                    return updatedNews;
                                }),
                                map(() => updatedNews)
                            )
                        )
                    )
            )
        );
    }

    /**
     * Update (legacy method for compatibility)
     */
    update(id: string, formData: NewsFormData): Observable<News> {
        const allNews = this.getAllFromStorage();
        const index = allNews.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`News with id ${id} not found`));
        }

        const updatedNews = this.formDataToNews(formData, id);
        allNews[index] = updatedNews;
        this.saveToStorage(allNews);

        // Update BehaviorSubject
        this._newsList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const listIndex = currentList.findIndex((n) => n.id === id);
                if (listIndex > -1) {
                    currentList[listIndex] = updatedNews;
                    this._newsList.next(currentList);
                }
            }
        });

        return of(updatedNews).pipe(delay(DELAY_MS));
    }

    patch(id: string, partialData: Partial<NewsFormData>): Observable<News> {
        const allNews = this.getAllFromStorage();
        const index = allNews.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`News with id ${id} not found`));
        }

        const existingNews = allNews[index];
        const updatedData: Partial<News> = {};

        // Copiar campos simples
        if (partialData.title !== undefined) updatedData.title = partialData.title;
        if (partialData.description !== undefined) updatedData.description = partialData.description;
        if (partialData.hasDetailView !== undefined) updatedData.hasDetailView = partialData.hasDetailView;
        if (partialData.largeDescription !== undefined) updatedData.largeDescription = partialData.largeDescription;
        if (partialData.registrationLink !== undefined) updatedData.registrationLink = partialData.registrationLink;
        if (partialData.code !== undefined) updatedData.code = partialData.code;
        if (partialData.category !== undefined) updatedData.category = partialData.category;
        if (partialData.time !== undefined) updatedData.time = partialData.time;
        if (partialData.action !== undefined) updatedData.action = partialData.action;
        if (partialData.actionUrl !== undefined) updatedData.actionUrl = partialData.actionUrl;

        // Convertir fecha si viene como DateTime
        if (partialData.date !== undefined) {
            if (typeof partialData.date === 'string') {
                updatedData.date = partialData.date;
            } else if (partialData.date && typeof partialData.date === 'object' && 'toISO' in partialData.date) {
                updatedData.date = partialData.date.toISO() || new Date().toISOString();
            }
        }

        // Limpiar imágenes
        if (partialData.images !== undefined) {
            updatedData.images = partialData.images.map((img) => ({
                id: img.id,
                previewUrl: img.previewUrl,
                url: img.url,
                base64: img.base64,
            }));
        }

        const updatedNews: News = {
            ...existingNews,
            ...updatedData,
            id,
            updatedAt: new Date().toISOString(),
        };

        allNews[index] = updatedNews;
        this.saveToStorage(allNews);

        return of(updatedNews).pipe(delay(DELAY_MS));
    }

    /**
     * Delete the news
     *
     * @param id
     */
    deleteNews(id: string): Observable<boolean> {
        return this.newsList$.pipe(
            take(1),
            switchMap((newsList) =>
                this._httpClient
                    .delete('api/apps/news/news', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted news
                            const index = newsList.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the news
                            if (index > -1) {
                                newsList.splice(index, 1);
                            }

                            // Update the news list
                            this._newsList.next(newsList);

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
        const allNews = this.getAllFromStorage();
        const index = allNews.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`News with id ${id} not found`));
        }

        allNews.splice(index, 1);
        this.saveToStorage(allNews);

        // Update BehaviorSubject
        this._newsList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const filteredList = currentList.filter((n) => n.id !== id);
                this._newsList.next(filteredList);
            }
        });

        return of(true).pipe(delay(DELAY_MS));
    }

    deleteMany(ids: string[]): Observable<number> {
        const allNews = this.getAllFromStorage();
        const initialLength = allNews.length;
        const filteredNews = allNews.filter((n) => !ids.includes(n.id));
        this.saveToStorage(filteredNews);

        const deletedCount = initialLength - filteredNews.length;
        return of(deletedCount).pipe(delay(DELAY_MS));
    }

    getNewsByIdSync(id: string): News | null {
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

