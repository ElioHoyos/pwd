import { Component, ViewChild, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { NotificationsListComponent } from './notifications-list.component';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import { QuillEditorComponent } from 'ngx-quill';
import {
    NotificationFormData,
    NotificationInstitutionOption,
    NotificationStatusOption,
    NotificationExcelFile,
} from './notifications.types';

@Component({
    selector: 'notifications-register',
    templateUrl: './register-notifications.component.html',
    styleUrls: ['./register-notifications.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatCardModule,
        FuseAlertComponent,
        QuillEditorComponent,
    ],
})
export class RegisterNotificationsComponent implements OnInit, OnDestroy {
    @ViewChild('notificationNgForm') notificationNgForm: NgForm;

    notificationId: string | null = null;
    isEditMode: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Form model
    title: string = '';
    description: string = '';
    institution: number | null = null;
    fileXlsx: string = '';
    imagenUrl: string = '';
    deepLink: string = '';
    notificationHtml: string = '';
    imageUrl: string = '';
    statusId: number | null = null;

    showAlert: boolean = false;
    isSubmitting: boolean = false;

    // Límites de caracteres
    readonly TITLE_MAX_CHARS: number = 43;
    readonly TITLE_NEAR_THRESHOLD: number = 5;
    readonly DESCRIPTION_MAX_CHARS: number = 128;
    readonly URL_MAX_CHARS: number = 128;
    readonly HTML_MAX_CHARS: number = 2048;

    // Archivo Excel
    excelFile: NotificationExcelFile | null = null;
    excelFileAlert: { type: FuseAlertType; message: string } | null = null;

    // Quill editor modules
    quillModules: any = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean'],
        ],
    };

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };

    // Opciones para institución
    institutionOptions: NotificationInstitutionOption[] = [
        { value: 10, label: 'Wiener' },
        { value: 20, label: 'Carrion' },
    ];

    // Opciones para estado
    statusOptions: NotificationStatusOption[] = [
        { value: 0, label: 'Baja' },
        { value: 1, label: 'Alta' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _notificationsListComponent: NotificationsListComponent
    ) {}

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngOnInit(): void {
        // Open the drawer
        this._notificationsListComponent.matDrawer.open();

        this.route.params.pipe(takeUntil(this._unsubscribeAll)).subscribe((params) => {
            this.notificationId = params['id'] || null;
            this.isEditMode = this.notificationId !== null && this.notificationId !== 'new';
            
            if (this.isEditMode && this.notificationId) {
                this.loadNotificationData(this.notificationId);
            } else {
                this.resetForm();
            }
        });

        // Get the notification
        this.notificationsService.notification$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notification) => {
                // Open the drawer in case it is closed
                this._notificationsListComponent.matDrawer.open();

                if (notification) {
                    this.notificationId = notification.id;
                    this.isEditMode = true;
                    this.loadNotificationData(notification.id);
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    private loadNotificationData(id: string): void {
        this.notificationsService
            .getById(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (notification) => {
                    if (notification) {
                        this.title = notification.title;
                        this.description = notification.description;
                        this.institution = notification.institution;
                        this.fileXlsx = notification.fileXlsx || '';
                        this.imagenUrl = notification.imagenUrl || '';
                        this.deepLink = notification.deepLink || '';
                        this.notificationHtml = notification.notificationHtml || '';
                        this.imageUrl = notification.imageUrl || '';
                        this.statusId = notification.statusId;
                    }
                },
                error: (error) => {
                    console.error('Error loading notification:', error);
                    this.alert = {
                        type: 'error',
                        message: 'Error al cargar la notificación',
                    };
                    this.showAlert = true;
                },
            });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.notificationNgForm?.controls[fieldName];
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    hasFieldError(fieldName: string, errorType: string): boolean {
        const field = this.notificationNgForm?.controls[fieldName];
        return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
    }

    isFormValid(): boolean {
        if (!this.title || !this.description || !this.institution || !this.statusId) {
            return false;
        }

        if (this.notificationNgForm) {
            const requiredFields = ['title', 'description', 'institution', 'statusId'];
            for (const fieldName of requiredFields) {
                const field = this.notificationNgForm.controls[fieldName];
                if (field && field.invalid && (field.dirty || field.touched)) {
                    return false;
                }
            }
        }

        return true;
    }

    submitForm(): void {
        if (this.notificationNgForm) {
            Object.keys(this.notificationNgForm.controls).forEach((key) => {
                this.notificationNgForm.controls[key].markAsTouched();
            });
        }

        if (!this.isFormValid()) {
            this.alert = {
                type: 'error',
                message: 'Por favor complete todos los campos requeridos.',
            };
            this.showAlert = true;
            return;
        }

        this.isSubmitting = true;
        this.showAlert = false;

        const formData: NotificationFormData = {
            title: this.title,
            description: this.description,
            institution: this.institution!,
            fileXlsx: this.fileXlsx || undefined,
            imagenUrl: this.imagenUrl || undefined,
            deepLink: this.deepLink || undefined,
            notificationHtml: this.notificationHtml || undefined,
            imageUrl: this.imageUrl || undefined,
            statusId: this.statusId!,
        };

        const operation = this.isEditMode && this.notificationId
            ? this.notificationsService.update(this.notificationId, formData)
            : this.notificationsService.create(formData);

        operation.pipe(takeUntil(this._unsubscribeAll)).subscribe({
            next: (savedNotification) => {
                this.isSubmitting = false;

                this.alert = {
                    type: 'success',
                    message: this.isEditMode
                        ? 'Notificación actualizada correctamente.'
                        : 'Notificación registrada correctamente.',
                };
                this.showAlert = true;

                setTimeout(() => {
                    if (this.isEditMode) {
                        this.router.navigate(['/notifications'], { skipLocationChange: false });
                    } else {
                        this.resetForm();
                        this.router.navigate(['/notifications'], { skipLocationChange: false });
                    }
                    this.showAlert = false;
                }, 2000);
            },
            error: (error) => {
                console.error('Error saving notification:', error);
                this.isSubmitting = false;
                this.alert = {
                    type: 'error',
                    message: this.isEditMode
                        ? 'Error al actualizar la notificación. Por favor, inténtalo de nuevo.'
                        : 'Error al registrar la notificación. Por favor, inténtalo de nuevo.',
                };
                this.showAlert = true;
            },
        });
    }

    resetForm(): void {
        this.title = '';
        this.description = '';
        this.institution = null;
        this.fileXlsx = '';
        this.imagenUrl = '';
        this.deepLink = '';
        this.notificationHtml = '';
        this.imageUrl = '';
        this.statusId = null;
        this.excelFile = null;
        this.excelFileAlert = null;

        if (this.notificationNgForm) {
            this.notificationNgForm.resetForm();
        }
    }

    get remainingTitleChars(): number {
        return this.TITLE_MAX_CHARS - (this.title ? this.title.length : 0);
    }

    get isTitleNearLimit(): boolean {
        const remaining = this.remainingTitleChars;
        return remaining > 0 && remaining <= this.TITLE_NEAR_THRESHOLD;
    }

    get isTitleAtLimit(): boolean {
        return this.remainingTitleChars === 0;
    }

    get remainingDescriptionChars(): number {
        return this.DESCRIPTION_MAX_CHARS - (this.description ? this.description.length : 0);
    }

    get remainingHtmlChars(): number {
        return this.HTML_MAX_CHARS - (this.notificationHtml ? this.notificationHtml.length : 0);
    }

    onExcelFileSelected(fileList: FileList | null): void {
        if (!fileList || fileList.length === 0) {
            return;
        }

        const file = fileList[0];
        
        // Validar que sea un archivo Excel
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
            this.excelFileAlert = {
                type: 'error',
                message: 'Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv)',
            };
            return;
        }

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            this.excelFileAlert = {
                type: 'error',
                message: 'El archivo es demasiado grande. Máximo 5MB.',
            };
            return;
        }

        // Guardar el archivo
        this.excelFile = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            name: file.name,
        };

        // En una implementación real, aquí subirías el archivo a Firestore
        // Por ahora, solo guardamos el nombre
        this.fileXlsx = file.name;
        this.excelFileAlert = null;
    }

    removeExcelFile(): void {
        this.excelFile = null;
        this.fileXlsx = '';
        this.excelFileAlert = null;
    }

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._notificationsListComponent.matDrawer.close();
    }
}


