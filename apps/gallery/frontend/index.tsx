import * as React from 'react';
import {
    initializeBlock,
    useRecords,
    useCustomProperties,
} from '@airtable/blocks/interface/ui';
import {FieldType} from '@airtable/blocks/interface/models';
import type {Base} from '@airtable/blocks/interface/models';
import type {Table} from '@airtable/blocks/interface/models';
import type {Field} from '@airtable/blocks/interface/models';
import type {Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {airtableColors, spacing, typography} from '@claude-code-interfaces/tokens';
import {EditableText} from '@claude-code-interfaces/primitives';
import {getFieldMeta} from '@claude-code-interfaces/helpers';
import './style.css';

const IMAGE_TYPES = new Set<FieldType>([FieldType.MULTIPLE_ATTACHMENTS]);
const NOTE_TYPES = new Set<FieldType>([FieldType.SINGLE_LINE_TEXT, FieldType.MULTILINE_TEXT]);

interface Attachment {
    id: string;
    url: string;
    filename: string;
    thumbnails?: {
        small?: {url: string};
        large?: {url: string};
        full?: {url: string};
    };
}

function getCustomProperties(base: Base) {
    // Field-type custom properties need a concrete `table` at schema-definition
    // time — getCustomProperties only receives `base`, not the value the builder
    // picks for `dataTable`, so it can't reactively follow that choice. This
    // matches base.tables[0], the same default as `dataTable` below, which
    // covers the common single-table case. GalleryForTable re-validates both
    // fields against whichever table is actually selected before trusting them.
    const table = base.tables[0];
    return [
        {key: 'dataTable', label: 'Data Table', type: 'table' as const, defaultValue: table},
        {
            key: 'imageField',
            label: 'Image Field',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: Field) => IMAGE_TYPES.has(field.type),
        },
        {
            key: 'noteField',
            label: 'Note Field',
            type: 'field' as const,
            table,
            shouldFieldBeAllowed: (field: Field) => NOTE_TYPES.has(field.type),
        },
        // Prompted at creation/setup time via the properties panel. Not used for any
        // API calls yet — this just wires the intake step so future visuals built from
        // this template can read customPropertyValueByKey.pat without re-plumbing it.
        {key: 'pat', label: 'Airtable Personal Access Token', type: 'string' as const, defaultValue: ''},
    ];
}

function Gallery() {
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const table = customPropertyValueByKey.dataTable as Table | null | undefined;
    const imageFieldProp = customPropertyValueByKey.imageField as Field | null | undefined;
    const noteFieldProp = customPropertyValueByKey.noteField as Field | null | undefined;
    const pat = customPropertyValueByKey.pat as string | undefined; // wired, unused for now

    if (!table) {
        return <div style={{padding: spacing[4]}}>Open the properties panel and choose a Data Table.</div>;
    }

    const imageMeta = getFieldMeta(table, imageFieldProp?.id ?? '');
    const imageField = imageFieldProp && IMAGE_TYPES.has(imageMeta.type as FieldType) ? imageFieldProp : null;

    if (!imageField) {
        return (
            <div style={{padding: spacing[4]}}>
                Open the properties panel and choose an Image Field (attachment) for {table.name}.
            </div>
        );
    }

    const noteMeta = getFieldMeta(table, noteFieldProp?.id ?? '');
    const noteField = noteFieldProp && NOTE_TYPES.has(noteMeta.type as FieldType) ? noteFieldProp : null;

    return <GalleryForTable table={table} imageField={imageField} noteField={noteField} pat={pat} />;
}

function GalleryForTable({
    table,
    imageField,
    noteField,
    pat: _pat,
}: {
    table: Table;
    imageField: Field;
    noteField: Field | null;
    pat?: string;
}) {
    // _pat: captured by the properties-panel intake step above, not yet consumed.
    // Visuals copied from this template that need to call api.airtable.com directly
    // can read it here instead of adding their own custom property.
    const records = useRecords(table);

    const commitNote = React.useCallback(
        async (record: AirtableRecord, value: string) => {
            if (!noteField) return;
            await table.updateRecordAsync(record, {[noteField.id]: value || null});
        },
        [table, noteField],
    );

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                overflow: 'auto',
                padding: spacing[4],
                boxSizing: 'border-box',
                fontFamily: typography.fontFamily,
            }}
        >
            <div
                className="gallery-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: spacing[4],
                }}
            >
                {records.map((record) => (
                    <GalleryCard
                        key={record.id}
                        record={record}
                        imageField={imageField}
                        noteField={noteField}
                        canEditNote={
                            noteField ? table.hasPermissionToUpdateRecord(record, {[noteField.id]: undefined}) : false
                        }
                        onCommitNote={(value) => commitNote(record, value)}
                    />
                ))}
            </div>
            {records.length === 0 && (
                <div style={{fontSize: typography.fontSize.sm, color: airtableColors.gray.dark1, marginTop: spacing[3]}}>
                    No records in this table.
                </div>
            )}
        </div>
    );
}

function GalleryCard({
    record,
    imageField,
    noteField,
    canEditNote,
    onCommitNote,
}: {
    record: AirtableRecord;
    imageField: Field;
    noteField: Field | null;
    canEditNote: boolean;
    onCommitNote: (value: string) => void | Promise<void>;
}) {
    const attachments = (record.getCellValue(imageField.id) as Attachment[] | null) ?? [];
    const image = attachments[0];
    const imageUrl = image?.thumbnails?.large?.url ?? image?.url;
    const note = noteField ? record.getCellValueAsString(noteField.id) : '';

    return (
        <div className="gallery-card">
            {imageUrl ? (
                <img className="gallery-card-image" src={imageUrl} alt={image?.filename ?? ''} />
            ) : (
                <div className="gallery-card-image-placeholder">No image</div>
            )}
            {noteField && (
                <div className="gallery-card-note">
                    <EditableText value={note} onCommit={onCommitNote} placeholder="Add a note…" disabled={!canEditNote} />
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <Gallery />});
