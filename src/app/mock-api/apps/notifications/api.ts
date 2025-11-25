import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import { cloneDeep, assign } from 'lodash-es';

const STORAGE_KEY = 'notifications_storage';

@Injectable({ providedIn: 'root' })
export class NotificationsAppMockApi {
    private _notifications: any[] = [];

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
            this._notifications = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            this._notifications = [];
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._notifications));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private sortNotifications(notifications: any[]): any[] {
        return notifications.sort((a, b) => {
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
        // @ Notifications - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/apps/notifications/all').reply(() => {
            // Load from storage
            this.loadFromStorage();
            // Clone the notifications
            const notifications = cloneDeep(this._notifications);
            // Sort the notifications
            const sortedNotifications = this.sortNotifications(notifications);
            // Return the response
            return [200, sortedNotifications];
        });

        // -----------------------------------------------------------------------------------------------------
        // @ Notifications Search - GET
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onGet('api/apps/notifications/search')
            .reply(({ request }) => {
                // Get the search query
                const query = request.params.get('query');

                // Load from storage
                this.loadFromStorage();
                // Clone the notifications
                let notifications = cloneDeep(this._notifications);

                // If the query exists...
                if (query) {
                    // Filter the notifications
                    notifications = notifications.filter(
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

                // Sort the notifications
                const sortedNotifications = this.sortNotifications(notifications);

                // Return the response
                return [200, sortedNotifications];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Notification - POST
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPost('api/apps/notifications/notification')
            .reply(() => {
                // Load from storage
                this.loadFromStorage();

                // Generate a new notification
                const maxOrder = this._notifications.length > 0 
                    ? Math.max(...this._notifications.map(n => n.order || 0))
                    : -1;

                const newNotification = {
                    id: FuseMockApiUtils.guid(),
                    title: 'Nueva Notificación',
                    description: '',
                    institution: 10,
                    statusId: 1,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    order: maxOrder + 1,
                };

                // Add the new notification
                this._notifications.unshift(newNotification);
                this.saveToStorage();

                // Return the response
                return [200, newNotification];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Notification - PATCH
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onPatch('api/apps/notifications/notification')
            .reply(({ request }) => {
                // Get the id and notification
                const id = request.body.id;
                const notification = cloneDeep(request.body);

                // Load from storage
                this.loadFromStorage();

                // Prepare the updated notification
                let updatedNotification = null;

                // Find the notification and update it
                this._notifications.forEach((item, index, notificationsArray) => {
                    if (item.id === id) {
                        // Update the notification
                        notificationsArray[index] = assign({}, notificationsArray[index], notification, {
                            id,
                            updatedAt: new Date().toISOString(),
                        });

                        // Store the updated notification
                        updatedNotification = notificationsArray[index];
                    }
                });

                // Save to storage
                if (updatedNotification) {
                    this.saveToStorage();
                }

                // Return the response
                return [200, updatedNotification];
            });

        // -----------------------------------------------------------------------------------------------------
        // @ Notification - DELETE
        // -----------------------------------------------------------------------------------------------------
        this._fuseMockApiService
            .onDelete('api/apps/notifications/notification')
            .reply(({ request }) => {
                // Get the id
                const id = request.params.get('id');

                // Load from storage
                this.loadFromStorage();

                // Find the notification and delete it
                this._notifications.forEach((item, index) => {
                    if (item.id === id) {
                        this._notifications.splice(index, 1);
                    }
                });

                // Save to storage
                this.saveToStorage();

                // Return the response
                return [200, true];
            });
    }
}


