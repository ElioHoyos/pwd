import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { delay, map, tap, take, switchMap, filter } from 'rxjs/operators';
import { Notification, NotificationFormData } from './notifications.types';

const STORAGE_KEY = 'notifications_storage';
const DELAY_MS = 300; // delay para simular llamada API

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    // Private
    private _notification: BehaviorSubject<Notification | null> = new BehaviorSubject(null);
    private _notificationsList: BehaviorSubject<Notification[] | null> = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for notification
     */
    get notification$(): Observable<Notification> {
        return this._notification.asObservable();
    }

    /**
     * Getter for notifications list
     */
    get notificationsList$(): Observable<Notification[]> {
        return this._notificationsList.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private getAllFromStorage(): Notification[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    private saveToStorage(notifications: Notification[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw error;
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private formDataToNotification(formData: NotificationFormData, id?: string): Notification {
        const now = new Date().toISOString();

        const existingNotification = id ? this.getNotificationByIdSync(id) : null;
        const allNotifications = this.getAllFromStorage();
        const maxOrder = allNotifications.length > 0 
            ? Math.max(...allNotifications.map(n => n.order || 0))
            : -1;
        
        return {
            id: id || this.generateId(),
            title: formData.title,
            description: formData.description,
            institution: formData.institution,
            fileXlsx: formData.fileXlsx,
            imagenUrl: formData.imagenUrl,
            deepLink: formData.deepLink,
            notificationHtml: formData.notificationHtml,
            imageUrl: formData.imageUrl,
            statusId: formData.statusId,
            createdAt: existingNotification?.createdAt || now,
            updatedAt: now,
            order: existingNotification?.order !== undefined ? existingNotification.order : maxOrder + 1,
        };
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get notifications list
     */
    getNotifications(): Observable<Notification[]> {
        return this._httpClient.get<Notification[]>('api/apps/notifications/all').pipe(
            tap((notifications) => {
                this._notificationsList.next(notifications);
            })
        );
    }

    /**
     * Search notifications with given query
     *
     * @param query
     */
    searchNotifications(query: string): Observable<Notification[]> {
        return this._httpClient
            .get<Notification[]>('api/apps/notifications/search', {
                params: { query },
            })
            .pipe(
                tap((notifications) => {
                    this._notificationsList.next(notifications);
                })
            );
    }

    /**
     * Get all notifications (legacy method for compatibility)
     */
    getAll(): Observable<Notification[]> {
        const allNotifications = this.getAllFromStorage();
        // Ordenar por campo order si existe, sino por fecha de creación (más recientes primero)
        const sortedNotifications = allNotifications.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Infinity;
            const orderB = b.order !== undefined ? b.order : Infinity;
            
            if (orderA !== Infinity || orderB !== Infinity) {
                return orderA - orderB;
            }
            
            // Si no hay orden personalizado, ordenar por fecha
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        return of(sortedNotifications).pipe(delay(DELAY_MS));
    }
    
    updateOrder(notificationIds: string[]): Observable<boolean> {
        const allNotifications = this.getAllFromStorage();
        
        // Actualizar el orden de cada notificación según su posición en el array
        notificationIds.forEach((id, index) => {
            const notificationIndex = allNotifications.findIndex(n => n.id === id);
            if (notificationIndex !== -1) {
                allNotifications[notificationIndex].order = index;
            }
        });
        
        this.saveToStorage(allNotifications);
        return of(true).pipe(delay(DELAY_MS));
    }

    /**
     * Get notification by id
     */
    getNotificationById(id: string): Observable<Notification> {
        return this._notificationsList.pipe(
            take(1),
            map((notificationsList) => {
                // Find the notification
                const notification = notificationsList.find((item) => item.id === id) || null;

                // Update the notification
                this._notification.next(notification);

                // Return the notification
                return notification;
            }),
            switchMap((notification) => {
                if (!notification) {
                    // Try to get from storage as fallback
                    const storedNotification = this.getAllFromStorage().find((n) => n.id === id);
                    if (storedNotification) {
                        this._notification.next(storedNotification);
                        return of(storedNotification);
                    }
                    return throwError(() => new Error('Could not found notification with id of ' + id + '!'));
                }

                return of(notification);
            })
        );
    }

    /**
     * Get by id (legacy method for compatibility)
     */
    getById(id: string): Observable<Notification | null> {
        const notification = this.getAllFromStorage().find((n) => n.id === id);
        return of(notification || null).pipe(delay(DELAY_MS));
    }

    /**
     * Create notification
     */
    createNotification(): Observable<Notification> {
        return this.notificationsList$.pipe(
            take(1),
            switchMap((notificationsList) =>
                this._httpClient
                    .post<Notification>('api/apps/notifications/notification', {})
                    .pipe(
                        map((newNotification) => {
                            // Update the notifications list with the new notification
                            this._notificationsList.next([newNotification, ...notificationsList]);

                            // Return the new notification
                            return newNotification;
                        })
                    )
            )
        );
    }

    /**
     * Create (legacy method for compatibility)
     */
    create(formData: NotificationFormData): Observable<Notification> {
        const notification = this.formDataToNotification(formData);
        const allNotifications = this.getAllFromStorage();
        allNotifications.push(notification);
        this.saveToStorage(allNotifications);
        
        // Update BehaviorSubject
        this._notificationsList.pipe(take(1)).subscribe((currentList) => {
            this._notificationsList.next([notification, ...(currentList || [])]);
        });
        
        return of(notification).pipe(delay(DELAY_MS));
    }

    /**
     * Update notification
     *
     * @param id
     * @param notification
     */
    updateNotification(id: string, notification: Notification): Observable<Notification> {
        return this.notificationsList$.pipe(
            take(1),
            switchMap((notificationsList) =>
                this._httpClient
                    .patch<Notification>('api/apps/notifications/notification', {
                        id,
                        ...notification,
                    })
                    .pipe(
                        map((updatedNotification) => {
                            // Find the index of the updated notification
                            const index = notificationsList.findIndex(
                                (item) => item.id === id
                            );

                            // Update the notification
                            if (index > -1) {
                                notificationsList[index] = updatedNotification;
                            }

                            // Update the notifications list
                            this._notificationsList.next(notificationsList);

                            // Return the updated notification
                            return updatedNotification;
                        }),
                        switchMap((updatedNotification) =>
                            this.notification$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the notification if it's selected
                                    this._notification.next(updatedNotification);

                                    // Return the updated notification
                                    return updatedNotification;
                                }),
                                map(() => updatedNotification)
                            )
                        )
                    )
            )
        );
    }

    /**
     * Update (legacy method for compatibility)
     */
    update(id: string, formData: NotificationFormData): Observable<Notification> {
        const allNotifications = this.getAllFromStorage();
        const index = allNotifications.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`Notification with id ${id} not found`));
        }

        const updatedNotification = this.formDataToNotification(formData, id);
        allNotifications[index] = updatedNotification;
        this.saveToStorage(allNotifications);

        // Update BehaviorSubject
        this._notificationsList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const listIndex = currentList.findIndex((n) => n.id === id);
                if (listIndex > -1) {
                    currentList[listIndex] = updatedNotification;
                    this._notificationsList.next(currentList);
                }
            }
        });

        return of(updatedNotification).pipe(delay(DELAY_MS));
    }

    /**
     * Delete the notification
     *
     * @param id
     */
    deleteNotification(id: string): Observable<boolean> {
        return this.notificationsList$.pipe(
            take(1),
            switchMap((notificationsList) =>
                this._httpClient
                    .delete('api/apps/notifications/notification', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted notification
                            const index = notificationsList.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the notification
                            if (index > -1) {
                                notificationsList.splice(index, 1);
                            }

                            // Update the notifications list
                            this._notificationsList.next(notificationsList);

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
        const allNotifications = this.getAllFromStorage();
        const index = allNotifications.findIndex((n) => n.id === id);

        if (index === -1) {
            return throwError(() => new Error(`Notification with id ${id} not found`));
        }

        allNotifications.splice(index, 1);
        this.saveToStorage(allNotifications);

        // Update BehaviorSubject
        this._notificationsList.pipe(take(1)).subscribe((currentList) => {
            if (currentList) {
                const filteredList = currentList.filter((n) => n.id !== id);
                this._notificationsList.next(filteredList);
            }
        });

        return of(true).pipe(delay(DELAY_MS));
    }

    getNotificationByIdSync(id: string): Notification | null {
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



