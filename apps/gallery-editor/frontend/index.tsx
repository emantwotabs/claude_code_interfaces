import './style.css';
import React, { useState, useCallback, useRef } from 'react';
import {
    initializeBlock,
    useBase,
    useRecords,
    useCustomProperties,
    CellRenderer,
    expandRecord,
} from '@airtable/blocks/interface/ui';
import { FieldType, Field, Table } from '@airtable/blocks/interface/models';
import {
    MagnifyingGlassPlusIcon,
    MagnifyingGlassMinusIcon,
    ArrowsOutCardinalIcon,
    XIcon,
    CropIcon,
} from '@phosphor-icons/react';

function getCustomProperties(base: ReturnType<typeof useBase>) {
    const table = base.tables[0];
    if (!table) return [];

    const isAttachmentField = (field: { id: string; config: { type: string } }) =>
        field.config.type === FieldType.MULTIPLE_ATTACHMENTS;
    const attachmentFields = table.fields.filter(isAttachmentField);
    const defaultAttachmentField = attachmentFields[0];

    const isTextField = (field: { id: string; config: { type: string } }) =>
        field.config.type === FieldType.SINGLE_LINE_TEXT ||
        field.config.type === FieldType.MULTILINE_TEXT;
    const defaultTitleField = table.primaryField;

    return [
        {
            key: 'attachmentField',
            label: 'Image',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: isAttachmentField,
            defaultValue: defaultAttachmentField,
        },
        {
            key: 'titleField',
            label: 'Title',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: isTextField,
            defaultValue: defaultTitleField,
        },
        {
            key: 'cardSize',
            label: 'Card size',
            type: 'enum' as const,
            possibleValues: [
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
            ],
            defaultValue: 'medium',
        },
        {
            key: 'showTitle',
            label: 'Show title on cards',
            type: 'boolean' as const,
            defaultValue: true,
        },
    ];
}

interface ImageEditorProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (settings: ImageSettings) => void;
    initialSettings?: ImageSettings;
}

interface ImageSettings {
    zoom: number;
    posX: number;
    posY: number;
    cropTop: number;
    cropRight: number;
    cropBottom: number;
    cropLeft: number;
}

function ImageEditor({ imageUrl, onClose, onSave, initialSettings }: ImageEditorProps) {
    const [zoom, setZoom] = useState(initialSettings?.zoom ?? 1);
    const [position, setPosition] = useState({ x: initialSettings?.posX ?? 0, y: initialSettings?.posY ?? 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [mode, setMode] = useState<'pan' | 'crop'>('pan');
    const [crop, setCrop] = useState({
        top: initialSettings?.cropTop ?? 0,
        right: initialSettings?.cropRight ?? 0,
        bottom: initialSettings?.cropBottom ?? 0,
        left: initialSettings?.cropLeft ?? 0,
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        if (mode === 'pan') {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.25, 5));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleReset = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setCrop({ top: 0, right: 0, bottom: 0, left: 0 });
    };

    const handleSave = () => {
        onSave({
            zoom,
            posX: position.x,
            posY: position.y,
            cropTop: crop.top,
            cropRight: crop.right,
            cropBottom: crop.bottom,
            cropLeft: crop.left,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-600">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Edit Image
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                    >
                        <XIcon size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setMode('pan')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer ${
                                mode === 'pan'
                                    ? 'bg-blue-blue text-white'
                                    : 'bg-white hover:bg-black/5 dark:bg-gray-600 dark:hover:bg-white/5 dark:text-white'
                            }`}
                        >
                            <ArrowsOutCardinalIcon size={18} />
                            Pan
                        </button>
                        <button
                            onClick={() => setMode('crop')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer ${
                                mode === 'crop'
                                    ? 'bg-blue-blue text-white'
                                    : 'bg-white hover:bg-black/5 dark:bg-gray-600 dark:hover:bg-white/5 dark:text-white'
                            }`}
                        >
                            <CropIcon size={18} />
                            Crop
                        </button>
                    </div>

                    <div
                        ref={containerRef}
                        className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <div
                            style={{
                                clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`,
                            }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <img
                                src={imageUrl}
                                alt="Edit preview"
                                className="max-w-full max-h-full object-contain select-none"
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                }}
                                draggable={false}
                            />
                        </div>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">
                                Zoom
                            </span>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 bg-white hover:bg-black/5 dark:bg-gray-600 dark:hover:bg-white/5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer"
                            >
                                <MagnifyingGlassMinusIcon size={18} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <input
                                type="range"
                                min="0.5"
                                max="5"
                                step="0.1"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <button
                                onClick={handleZoomIn}
                                className="p-2 bg-white hover:bg-black/5 dark:bg-gray-600 dark:hover:bg-white/5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer"
                            >
                                <MagnifyingGlassPlusIcon size={18} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>

                        {mode === 'crop' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Top</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={crop.top}
                                        onChange={(e) => setCrop({ ...crop, top: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{crop.top}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Bottom</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={crop.bottom}
                                        onChange={(e) => setCrop({ ...crop, bottom: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{crop.bottom}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Left</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={crop.left}
                                        onChange={(e) => setCrop({ ...crop, left: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{crop.left}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">Right</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="40"
                                        value={crop.right}
                                        onChange={(e) => setCrop({ ...crop, right: parseInt(e.target.value) })}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{crop.right}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-600">
                    <button
                        onClick={handleReset}
                        className="bg-transparent hover:bg-black/5 dark:text-white dark:hover:bg-white/5 px-3 py-1.5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer"
                    >
                        Reset
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-white hover:bg-black/5 dark:bg-gray-600 dark:hover:bg-white/5 dark:text-white px-3 py-1.5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-black text-white px-3 py-1.5 rounded-md shadow-xs hover:shadow-sm hover:cursor-pointer"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}

interface GalleryCardProps {
    record: ReturnType<typeof useRecords>[number];
    attachmentField: Field | undefined;
    titleField: Field | undefined;
    showTitle: boolean;
    cardSize: string;
    table: Table;
    imageSettings: Record<string, ImageSettings>;
    onEditImage: (recordId: string, imageUrl: string) => void;
}

function GalleryCard({
    record,
    attachmentField,
    titleField,
    showTitle,
    cardSize,
    table,
    imageSettings,
    onEditImage,
}: GalleryCardProps) {
    const canExpand = table.hasPermissionToExpandRecords();
    const attachments = attachmentField ? record.getCellValue(attachmentField) : null;
    const firstAttachment = Array.isArray(attachments) && attachments.length > 0 ? attachments[0] : null;
    const imageUrl = firstAttachment?.thumbnails?.large?.url || firstAttachment?.url;
    const settings = imageSettings[record.id];

    const sizeClasses = {
        small: 'h-32',
        medium: 'h-48',
        large: 'h-64',
    };

    const handleCardClick = () => {
        if (canExpand) {
            expandRecord(record);
        }
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (imageUrl) {
            onEditImage(record.id, imageUrl);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={`group bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${
                canExpand ? 'cursor-pointer' : ''
            }`}
        >
            <div
                className={`relative ${sizeClasses[cardSize as keyof typeof sizeClasses] || sizeClasses.medium} bg-gray-100 dark:bg-gray-800 overflow-hidden`}
            >
                {imageUrl ? (
                    <>
                        <div
                            className="w-full h-full"
                            style={{
                                clipPath: settings
                                    ? `inset(${settings.cropTop}% ${settings.cropRight}% ${settings.cropBottom}% ${settings.cropLeft}%)`
                                    : undefined,
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                style={
                                    settings
                                        ? {
                                              transform: `translate(${settings.posX}px, ${settings.posY}px) scale(${settings.zoom})`,
                                          }
                                        : undefined
                                }
                            />
                        </div>
                        <button
                            onClick={handleEditClick}
                            className="absolute bottom-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700"
                        >
                            <CropIcon size={16} className="text-gray-700 dark:text-gray-300" />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <span className="text-sm">No image</span>
                    </div>
                )}
            </div>
            {showTitle && titleField && (
                <div className="p-3 border-t border-gray-100 dark:border-gray-600">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        <CellRenderer record={record} field={titleField} />
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomGallery() {
    const base = useBase();
    const { customPropertyValueByKey, errorState } = useCustomProperties(getCustomProperties);

    const table = base.tables[0];
    const records = useRecords(table);

    const [imageSettings, setImageSettings] = useState<Record<string, ImageSettings>>({});
    const [editingImage, setEditingImage] = useState<{ recordId: string; imageUrl: string } | null>(null);

    const attachmentField = customPropertyValueByKey?.attachmentField as Field | undefined;
    const titleField = customPropertyValueByKey?.titleField as Field | undefined;
    const cardSize = (customPropertyValueByKey?.cardSize as string) || 'medium';
    const showTitle = customPropertyValueByKey?.showTitle !== false;

    const handleEditImage = useCallback((recordId: string, imageUrl: string) => {
        setEditingImage({ recordId, imageUrl });
    }, []);

    const handleSaveImageSettings = useCallback(
        (settings: ImageSettings) => {
            if (editingImage) {
                setImageSettings((prev) => ({
                    ...prev,
                    [editingImage.recordId]: settings,
                }));
            }
        },
        [editingImage]
    );

    const handleCloseEditor = useCallback(() => {
        setEditingImage(null);
    }, []);

    if (errorState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                <div className="text-center">
                    <p className="text-red-500 dark:text-red-400">
                        Error loading custom properties. Please configure the element.
                    </p>
                </div>
            </div>
        );
    }

    if (!table) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">No table available.</p>
                </div>
            </div>
        );
    }

    if (!attachmentField) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Configure Image Field
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Please select an attachment field in the properties panel to display images in the gallery.
                    </p>
                </div>
            </div>
        );
    }

    const gridClasses = {
        small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 p-4 sm:p-6">
            {records.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500 dark:text-gray-400">No records found.</p>
                </div>
            ) : (
                <div
                    className={`grid gap-4 ${gridClasses[cardSize as keyof typeof gridClasses] || gridClasses.medium}`}
                >
                    {records.map((record) => (
                        <GalleryCard
                            key={record.id}
                            record={record}
                            attachmentField={attachmentField}
                            titleField={titleField}
                            showTitle={showTitle}
                            cardSize={cardSize}
                            table={table}
                            imageSettings={imageSettings}
                            onEditImage={handleEditImage}
                        />
                    ))}
                </div>
            )}

            {editingImage && (
                <ImageEditor
                    imageUrl={editingImage.imageUrl}
                    onClose={handleCloseEditor}
                    onSave={handleSaveImageSettings}
                    initialSettings={imageSettings[editingImage.recordId]}
                />
            )}
        </div>
    );
}

initializeBlock({ interface: () => <CustomGallery /> });
