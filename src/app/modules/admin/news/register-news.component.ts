import { Component, ViewChild, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NewsService } from './news.service';
import { NewsListComponent } from './news-list.component';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import {
    NewsFormData,
    NewsCodeOption,
    NewsCategoryOption,
    NewsActionOption,
} from './news.types';
import { DateTime } from 'luxon';
import { TimePickerComponent } from './time-picker/time-picker.component';

@Component({
    selector: 'news-register',
    templateUrl: './register-news.component.html',
    styleUrls: ['./register-news.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatDatepickerModule,
        MatProgressSpinnerModule,
        MatCardModule,
        DragDropModule,
        FuseAlertComponent,
        TimePickerComponent,
    ],
})
export class RegisterNewsComponent implements OnInit, OnDestroy {
    @ViewChild('newsNgForm') newsNgForm: NgForm;

    newsId: string | null = null;
    isEditMode: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Form model
    title: string = '';
    description: string = '';
    hasDetailView: boolean = false;
    largeDescription: string = '';
    registrationLink: string = '';
    code: number | null = null;
    category: number | null = null;
    date: DateTime | null = null;
    time: string = '';
    action: number = 0;
    actionUrl: string = '';

    showAlert: boolean = false;
    isSubmitting: boolean = false;

    // Límite de caracteres del título
    readonly TITLE_MAX_CHARS: number = 43;
    readonly TITLE_NEAR_THRESHOLD: number = 5; // umbral de aviso

    // Límites de descripciones
    readonly DESCRIPTION_MAX_CHARS: number = 250; // descripción corta
    readonly LARGE_DESCRIPTION_MAX_CHARS: number = 500; // descripción larga

    // Imágenes
    readonly IMAGES_MAX: number = 5;
    images: { id: string; file?: File; previewUrl: string; base64?: string }[] = [];
    isDragOver: boolean = false;
    imagesAlert: { type: FuseAlertType; message: string } | null = null;

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };

    // Opciones para el código (Wiener/Carrion)
    codeOptions: NewsCodeOption[] = [
        { value: 10, label: 'Wiener' },
        { value: 20, label: 'Carrion' },
    ];

    // Opciones para la categoría
    categoryOptions: NewsCategoryOption[] = [
        { value: 1, label: 'Evento' },
        { value: 2, label: 'Seminario' },
        { value: 3, label: 'Taller' },
        { value: 4, label: 'Noticias de interés' },
        { value: 5, label: 'Bienestar' },
    ];

    // Opciones para la acción
    actionOptions: NewsActionOption[] = [
        { value: 0, label: 'Sin acción' },
        { value: 1, label: 'Calendario' },
        { value: 2, label: 'URL' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private newsService: NewsService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _newsListComponent: NewsListComponent
    ) {}

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngOnInit(): void {
        // Open the drawer
        this._newsListComponent.matDrawer.open();

        this.route.params.pipe(takeUntil(this._unsubscribeAll)).subscribe((params) => {
            this.newsId = params['id'] || null;
            this.isEditMode = this.newsId !== null && this.newsId !== 'new';

            if (this.isEditMode && this.newsId) {
                this.loadNewsData(this.newsId);
            } else {
                this.resetForm();
            }
        });

        // Get the news
        this.newsService.news$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((news) => {
                // Open the drawer in case it is closed
                this._newsListComponent.matDrawer.open();

                if (news) {
                    this.newsId = news.id;
                    this.isEditMode = true;
                    this.loadNewsData(news.id);
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    private loadNewsData(id: string): void {
        this.newsService
            .getById(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (news) => {
                    if (news) {
                        this.title = news.title;
                        this.description = news.description;
                        this.hasDetailView = news.hasDetailView;
                        this.largeDescription = news.largeDescription || '';
                        this.registrationLink = news.registrationLink || '';
                        this.code = news.code;
                        this.category = news.category;
                        this.date = DateTime.fromISO(news.date);
                        this.time = news.time || '';
                        this.action = news.action;
                        this.actionUrl = news.actionUrl || '';
                        // Cargar imágenes: priorizar base64, evitar blob URLs expiradas
                        if (news.images && news.images.length > 0) {
                            this.images = news.images.map((img) => {
                                let previewUrl = '';
                                if (img.base64) {
                                    previewUrl = img.base64;
                                } else if (img.url && !img.url.startsWith('blob:')) {
                                    previewUrl = img.url;
                                } else if (img.previewUrl && !img.previewUrl.startsWith('blob:')) {
                                    previewUrl = img.previewUrl;
                                }

                                return {
                                    id: img.id,
                                    previewUrl: previewUrl,
                                    file: img.file,
                                    base64: img.base64,
                                };
                            });
                        }
                    }
                },
                error: (error) => {
                    console.error('Error loading news:', error);
                    this.alert = {
                        type: 'error',
                        message: 'Error al cargar la noticia',
                    };
                    this.showAlert = true;
                },
            });
    }

    get isTimeRequired(): boolean {
        // Taller (categoría 3) no requiere hora
        if (this.category === null || this.category === undefined) {
            return true;
        }
        return this.category !== 3;
    }

    get shouldValidateTime(): boolean {
        // Validar hora solo si no es Taller
        return this.category !== null && this.category !== undefined && this.category !== 3;
    }

    get isDetailViewEnabled(): boolean {
        return this.hasDetailView;
    }

    get isActionUrlRequired(): boolean {
        return this.action === 2;
    }

    onCategoryChange(): void {
        // Taller no requiere hora
        if (this.category === 3) {
            this.time = '';
            if (this.newsNgForm && this.newsNgForm.controls['time']) {
                const timeControl = this.newsNgForm.controls['time'];
                timeControl.clearValidators();
                timeControl.setErrors(null);
                timeControl.markAsUntouched();
                timeControl.markAsPristine();
            }
        }
    }

    onHasDetailViewChange(): void {
        if (!this.hasDetailView) {
            this.largeDescription = '';
            this.registrationLink = '';
        }
    }

    onActionChange(): void {
        if (this.action !== 2) {
            this.actionUrl = '';
        }
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.newsNgForm?.controls[fieldName];
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    hasFieldError(fieldName: string, errorType: string): boolean {
        const field = this.newsNgForm?.controls[fieldName];
        return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
    }

    isFormValid(): boolean {
        if (!this.title || !this.description || !this.code || !this.category || !this.date) {
            return false;
        }

        if (this.hasDetailView) {
            if (!this.largeDescription || !this.registrationLink) {
                return false;
            }
        }

        // Taller no requiere hora
        if (this.shouldValidateTime) {
            if (!this.time || this.time === '') {
                return false;
            }
        }

        if (this.action === 2 && !this.actionUrl) {
            return false;
        }

        if (this.newsNgForm) {
            const basicFields = ['title', 'description', 'code', 'category', 'date', 'action'];
            for (const fieldName of basicFields) {
                const field = this.newsNgForm.controls[fieldName];
                if (field && field.invalid && (field.dirty || field.touched)) {
                    return false;
                }
            }
        }

        return true;
    }

    submitForm(): void {
        if (this.newsNgForm) {
            Object.keys(this.newsNgForm.controls).forEach((key) => {
                this.newsNgForm.controls[key].markAsTouched();
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

        // Convertir imágenes a base64 antes de guardar
        const convertImagesToBase64 = async (): Promise<NewsFormData> => {
            const imagesWithBase64 = await Promise.all(
                this.images.map(async (img) => {
                    let base64 = img.base64;

                    // Si no hay base64 pero hay file, convertir a base64
                    if (!base64 && img.file) {
                        base64 = await this.fileToBase64(img.file);
                    }

                    return {
                        id: img.id,
                        previewUrl: img.previewUrl,
                        file: img.file,
                        base64: base64,
                    };
                })
            );

            return {
                title: this.title,
                description: this.description,
                hasDetailView: this.hasDetailView,
                largeDescription: this.hasDetailView ? this.largeDescription : undefined,
                registrationLink: this.hasDetailView ? this.registrationLink : undefined,
                code: this.code!,
                category: this.category!,
                date: this.date as any,
                time: this.shouldValidateTime ? this.time : undefined,
                action: this.action,
                actionUrl: this.action === 2 ? this.actionUrl : undefined,
                images: imagesWithBase64,
            };
        };

        convertImagesToBase64().then((formData) => {
            const operation = this.isEditMode && this.newsId
                ? this.newsService.update(this.newsId, formData)
                : this.newsService.create(formData);

            operation.pipe(takeUntil(this._unsubscribeAll)).subscribe({
            next: (savedNews) => {
                this.isSubmitting = false;

                this.alert = {
                    type: 'success',
                    message: this.isEditMode
                        ? 'Noticia actualizada correctamente.'
                        : 'Noticia registrada correctamente.',
                };
                this.showAlert = true;

                setTimeout(() => {
                    if (this.isEditMode) {
                        this.router.navigate(['/news'], { skipLocationChange: false });
                    } else {
                        this.resetForm();
                        this.router.navigate(['/news'], { skipLocationChange: false });
                    }
                    this.showAlert = false;
                }, 2000);
            },
            error: (error) => {
                console.error('Error saving news:', error);
                this.isSubmitting = false;
                this.alert = {
                    type: 'error',
                    message: this.isEditMode
                        ? 'Error al actualizar la noticia. Por favor, inténtalo de nuevo.'
                        : 'Error al registrar la noticia. Por favor, inténtalo de nuevo.',
                };
                this.showAlert = true;
            },
        });
        }).catch((error) => {
            console.error('Error converting images:', error);
            this.isSubmitting = false;
            this.alert = {
                type: 'error',
                message: 'Error al procesar las imágenes. Por favor, inténtalo de nuevo.',
            };
            this.showAlert = true;
        });
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    resetForm(): void {
        this.title = '';
        this.description = '';
        this.hasDetailView = false;
        this.largeDescription = '';
        this.registrationLink = '';
        this.code = null;
        this.category = null;
        this.date = null;
        this.time = '';
        this.action = 0;
        this.actionUrl = '';
        // Liberar blob URLs
        this.images.forEach((i) => {
            if (i.previewUrl && i.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(i.previewUrl);
            }
        });
        this.images = [];
        this.imagesAlert = null;

        if (this.newsNgForm) {
            this.newsNgForm.resetForm();
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

    get remainingLargeDescriptionChars(): number {
        return this.LARGE_DESCRIPTION_MAX_CHARS - (this.largeDescription ? this.largeDescription.length : 0);
    }

    onFilesSelected(fileList: FileList | File[] | null): void {
        if (!fileList) { return; }
        const incoming: File[] = Array.from(fileList as any);

        for (const file of incoming) {
            if (this.images.length >= this.IMAGES_MAX) {
                this.imagesAlert = { type: 'warning', message: `Máximo ${this.IMAGES_MAX} imágenes.` };
                break;
            }
            if (!this.isValidImage(file)) {
                this.imagesAlert = { type: 'warning', message: `Formato no soportado: ${file.name}` };
                continue;
            }

            const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const previewUrl = URL.createObjectURL(file);

            // Convertir a base64 en background
            this.fileToBase64(file).then((base64) => {
                const imageIndex = this.images.findIndex((img) => img.id === id);
                if (imageIndex !== -1) {
                    this.images[imageIndex].base64 = base64;
                }
            }).catch((error) => {
                console.error('Error converting image to base64:', error);
            });

            this.images.push({ id, file, previewUrl });
        }
    }

    private isValidImage(file: File): boolean {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        return allowed.includes(file.type);
    }

    removeImage(id: string): void {
        const idx = this.images.findIndex((i) => i.id === id);
        if (idx > -1) {
            if (this.images[idx].previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(this.images[idx].previewUrl);
            }
            this.images.splice(idx, 1);
        }
    }

    drop(event: CdkDragDrop<any[]>): void {
        moveItemInArray(this.images, event.previousIndex, event.currentIndex);
    }

    moveImage(index: number, delta: number): void {
        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= this.images.length) {
            return;
        }
        moveItemInArray(this.images, index, newIndex);
    }

    onDropZoneOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = true;
    }

    onDropZoneLeave(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = false;
    }

    onDropZoneDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver = false;
        const files = event.dataTransfer?.files;
        if (files && files.length) {
            this.onFilesSelected(files);
        }
    }

    trackByImageId(_index: number, item: { id: string }): string {
        return item.id;
    }

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._newsListComponent.matDrawer.close();
    }
}
